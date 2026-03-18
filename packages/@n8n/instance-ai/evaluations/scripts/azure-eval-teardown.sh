#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Azure Eval VM Teardown
#
# Stops or deletes Azure eval VMs. Discovers resources via the .env file
# or falls back to tag-based discovery.
#
# Usage:
#   ./azure-eval-teardown.sh           # stop VMs (no compute cost, keeps disk)
#   ./azure-eval-teardown.sh --delete  # delete VMs + disks entirely
#   ./azure-eval-teardown.sh --list    # list eval resources (no changes)
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.eval-remote.env"

DELETE=false
LIST_ONLY=false

for arg in "$@"; do
	case "$arg" in
		--delete) DELETE=true ;;
		--list) LIST_ONLY=true ;;
		*) echo "Unknown arg: $arg"; exit 1 ;;
	esac
done

# Discover resource group: prefer .env file, fall back to tag query
if [[ -f "$ENV_FILE" ]]; then
	# shellcheck source=/dev/null
	source "$ENV_FILE"
	RESOURCE_GROUP="$AZURE_RESOURCE_GROUP"
else
	echo "No .env file found. Discovering eval resources by tag..."
	RESOURCE_GROUP=$(az group list --tag purpose=eval --tag team=ai-tigers \
		--query "[0].name" --output tsv 2>/dev/null || true)

	if [[ -z "$RESOURCE_GROUP" ]]; then
		echo "No eval resources found (checked tags: team=ai-tigers, purpose=eval)."
		exit 0
	fi
	echo "Found resource group: $RESOURCE_GROUP"
fi

echo "=== Azure Eval VM Teardown ==="
echo "Resource group: $RESOURCE_GROUP"
echo ""

# List resources
echo "Resources in $RESOURCE_GROUP:"
az resource list --resource-group "$RESOURCE_GROUP" \
	--query "[].{Name:name, Type:type, Location:location}" \
	--output table 2>/dev/null || echo "  (could not list resources)"
echo ""

if $LIST_ONLY; then
	exit 0
fi

if $DELETE; then
	echo "Deleting resource group $RESOURCE_GROUP (all VMs + disks)..."
	az group delete --name "$RESOURCE_GROUP" --yes --no-wait
	echo "Deletion initiated (runs in background)."
	rm -f "$ENV_FILE"
	echo "Removed $ENV_FILE"
else
	# Discover VMs by tag if .env didn't provide IPs
	VM_NAMES=$(az vm list --resource-group "$RESOURCE_GROUP" \
		--query "[].name" --output tsv 2>/dev/null)

	if [[ -z "$VM_NAMES" ]]; then
		echo "No VMs found in $RESOURCE_GROUP."
		exit 0
	fi

	while IFS= read -r VM_NAME; do
		echo "Stopping $VM_NAME..."
		az vm deallocate --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --no-wait 2>/dev/null \
			|| echo "  Warning: could not stop $VM_NAME"
	done <<< "$VM_NAMES"

	echo ""
	echo "VMs deallocated (no compute charges)."
	echo "To restart: az vm start --resource-group $RESOURCE_GROUP --name <vm-name>"
	echo "To delete entirely: $0 --delete"
fi
