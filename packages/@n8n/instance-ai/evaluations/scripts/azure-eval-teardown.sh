#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Azure Eval VM Teardown
#
# Stops or deletes Azure eval VMs.
#
# Usage:
#   ./azure-eval-teardown.sh           # stop VMs (no compute cost, keeps disk)
#   ./azure-eval-teardown.sh --delete  # delete VMs + disks entirely
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.eval-remote.env"

if [[ ! -f "$ENV_FILE" ]]; then
	echo "Error: $ENV_FILE not found. Nothing to tear down."
	exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

DELETE=false
if [[ "${1:-}" == "--delete" ]]; then
	DELETE=true
fi

echo "=== Azure Eval VM Teardown ==="

if $DELETE; then
	echo "Deleting resource group $AZURE_RESOURCE_GROUP (all VMs + disks)..."
	az group delete --name "$AZURE_RESOURCE_GROUP" --yes --no-wait
	echo "Deletion initiated (runs in background)."
	rm -f "$ENV_FILE"
	echo "Removed $ENV_FILE"
else
	VM_COUNT=${#AZURE_VM_IPS[@]}
	for idx in $(seq 1 "$VM_COUNT"); do
		VM_NAME="n8n-eval-vm-$idx"
		echo "Stopping $VM_NAME..."
		az vm deallocate --resource-group "$AZURE_RESOURCE_GROUP" --name "$VM_NAME" --no-wait 2>/dev/null || echo "  Warning: could not stop $VM_NAME"
	done
	echo ""
	echo "VMs deallocated (no compute charges)."
	echo "To restart: az vm start --resource-group $AZURE_RESOURCE_GROUP --name n8n-eval-vm-1"
	echo "To delete entirely: $0 --delete"
fi
