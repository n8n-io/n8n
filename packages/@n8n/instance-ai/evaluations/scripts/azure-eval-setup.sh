#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Azure Eval VM Setup
#
# Provisions one or more Azure VMs for running checklist evaluations.
# Each VM runs 3 n8n instances on ports 5678-5680.
#
# Prerequisites:
#   - Azure CLI (az) installed and logged in
#   - SSH key at ~/.ssh/id_rsa.pub
#   - Environment variables: ANTHROPIC_API_KEY, N8N_ENCRYPTION_KEY,
#     N8N_EVAL_EMAIL, N8N_EVAL_PASSWORD
#
# Usage:
#   ./azure-eval-setup.sh              # 1 VM (default)
#   ./azure-eval-setup.sh --count 2    # 2 VMs
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.eval-remote.env"

# Defaults
VM_COUNT=1
RESOURCE_GROUP="n8n-eval-rg"
VM_SIZE="Standard_D8s_v5"
VM_IMAGE="Ubuntu2204"
VM_USER="azureuser"
LOCATION="eastus"
REPO_URL="git@github.com:n8n-io/n8n-ai-tigers.git"
REPO_BRANCH="feat/checklist-execution-eval-clean"

# Parse args
while [[ $# -gt 0 ]]; do
	case "$1" in
		--count) VM_COUNT="$2"; shift 2 ;;
		--size) VM_SIZE="$2"; shift 2 ;;
		--location) LOCATION="$2"; shift 2 ;;
		--branch) REPO_BRANCH="$2"; shift 2 ;;
		*) echo "Unknown arg: $1"; exit 1 ;;
	esac
done

# Validate secrets
for var in ANTHROPIC_API_KEY N8N_ENCRYPTION_KEY N8N_EVAL_EMAIL N8N_EVAL_PASSWORD; do
	if [[ -z "${!var:-}" ]]; then
		echo "Error: $var is not set. Export it before running this script."
		exit 1
	fi
done

echo "=== Azure Eval VM Setup ==="
echo "VMs: $VM_COUNT x $VM_SIZE"
echo "Location: $LOCATION"
echo "Branch: $REPO_BRANCH"
echo ""

# Create resource group
echo "Creating resource group $RESOURCE_GROUP..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none 2>/dev/null || true

VM_IPS=()

for idx in $(seq 1 "$VM_COUNT"); do
	VM_NAME="n8n-eval-vm-$idx"
	echo ""
	echo "--- Setting up $VM_NAME ---"

	# Create VM
	echo "  Creating VM..."
	VM_IP=$(az vm create \
		--resource-group "$RESOURCE_GROUP" \
		--name "$VM_NAME" \
		--size "$VM_SIZE" \
		--image "$VM_IMAGE" \
		--admin-username "$VM_USER" \
		--ssh-key-values ~/.ssh/id_rsa.pub \
		--public-ip-sku Standard \
		--output tsv \
		--query publicIpAddress 2>/dev/null) || {
		# VM may already exist — get its IP
		VM_IP=$(az vm show \
			--resource-group "$RESOURCE_GROUP" \
			--name "$VM_NAME" \
			--show-details \
			--query publicIps \
			--output tsv 2>/dev/null)
		echo "  VM already exists at $VM_IP"
	}

	VM_IPS+=("$VM_IP")
	echo "  VM IP: $VM_IP"

	# Open SSH port
	az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 22 --output none 2>/dev/null || true

	# Wait for SSH
	echo "  Waiting for SSH..."
	for attempt in $(seq 1 30); do
		if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "$VM_USER@$VM_IP" "echo ok" >/dev/null 2>&1; then
			break
		fi
		sleep 2
	done

	# Install dependencies and setup
	echo "  Installing dependencies..."
	ssh -o StrictHostKeyChecking=no "$VM_USER@$VM_IP" bash <<'SETUP_EOF'
set -euo pipefail

# Install Node.js 20
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential git tmux
fi

# Install pnpm
if ! command -v pnpm >/dev/null 2>&1; then
    sudo npm install -g pnpm@9
fi

echo "Node: $(node --version), pnpm: $(pnpm --version)"
SETUP_EOF

	# Clone and build repo (using SSH agent forwarding)
	echo "  Cloning and building repo..."
	ssh -A -o StrictHostKeyChecking=no "$VM_USER@$VM_IP" bash <<CLONE_EOF
set -euo pipefail

if [ ! -d ~/n8n-ai-tigers ]; then
    git clone --branch "$REPO_BRANCH" "$REPO_URL" ~/n8n-ai-tigers
else
    cd ~/n8n-ai-tigers
    git fetch origin
    git checkout "$REPO_BRANCH"
    git pull origin "$REPO_BRANCH"
fi

cd ~/n8n-ai-tigers
pnpm install --frozen-lockfile 2>&1 | tail -5
pnpm build > /tmp/build.log 2>&1 || { tail -20 /tmp/build.log; exit 1; }
echo "Build complete."
CLONE_EOF

	# Write .env with secrets
	echo "  Writing secrets..."
	ssh -o StrictHostKeyChecking=no "$VM_USER@$VM_IP" bash <<ENV_EOF
cat > ~/n8n-ai-tigers/.env <<'DOTENV'
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
N8N_ENCRYPTION_KEY=$N8N_ENCRYPTION_KEY
N8N_EVAL_EMAIL=$N8N_EVAL_EMAIL
N8N_EVAL_PASSWORD=$N8N_EVAL_PASSWORD
DOTENV
ENV_EOF

	# Create systemd services for 3 n8n instances
	echo "  Setting up n8n services..."
	ssh -o StrictHostKeyChecking=no "$VM_USER@$VM_IP" bash <<'SVC_EOF'
set -euo pipefail

for PORT in 5678 5679 5680; do
    SERVICE_NAME="n8n-${PORT}"
    sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" > /dev/null <<UNIT
[Unit]
Description=n8n instance on port ${PORT}
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/home/azureuser/n8n-ai-tigers
EnvironmentFile=/home/azureuser/n8n-ai-tigers/.env
Environment=N8N_PORT=${PORT}
Environment=N8N_USER_FOLDER=/home/azureuser/.n8n-${PORT}
Environment=N8N_RUNNERS_ENABLED=true
ExecStart=/usr/bin/npx n8n start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

    # Create separate user folders
    mkdir -p "/home/azureuser/.n8n-${PORT}"

    sudo systemctl daemon-reload
    sudo systemctl enable "${SERVICE_NAME}" >/dev/null 2>&1
    sudo systemctl restart "${SERVICE_NAME}"
done

# Wait for instances to be ready
echo "  Waiting for n8n instances to start..."
for PORT in 5678 5679 5680; do
    for attempt in $(seq 1 30); do
        if curl -sf "http://localhost:${PORT}/healthz" >/dev/null 2>&1; then
            echo "    n8n :${PORT} ready"
            break
        fi
        sleep 2
    done
done
SVC_EOF

	echo "  $VM_NAME ready at $VM_IP"
done

# Write config file
echo ""
echo "Writing config to $ENV_FILE..."
cat > "$ENV_FILE" <<CONFIG
AZURE_RESOURCE_GROUP=$RESOURCE_GROUP
AZURE_VM_USER=$VM_USER
AZURE_VM_IPS=(${VM_IPS[*]})
REPO_PATH=/home/$VM_USER/n8n-ai-tigers
CONFIG

echo ""
echo "=== Setup Complete ==="
echo "VMs: ${VM_IPS[*]}"
echo ""
echo "Next steps:"
echo "  ./run-remote-eval.sh --tags build --verbose"
echo "  ./sync-eval-report.sh --open"
