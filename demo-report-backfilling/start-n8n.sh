#!/usr/bin/env bash
# Usage:
#   ./start-n8n.sh             insights only, instance reporting off
#   ./start-n8n.sh reporting   instance reporting on, sending to the local receiver
set -euo pipefail
source "$(dirname "$0")/env.sh"

export N8N_LOG_LEVEL=debug
export N8N_LOG_SCOPES=insights,instance-reporting
export N8N_DIAGNOSTICS_ENABLED=false

if [[ "${1:-}" == "reporting" ]]; then
	export N8N_ENABLED_MODULES=instance-reporting
	export N8N_INSTANCE_REPORTING_BASE_URL="$RECEIVER_URL"
	export N8N_INSTANCE_REPORTING_AUTH_TOKEN="$WRITE_TOKEN"
	export N8N_INSTANCE_REPORTING_LABEL="$DEMO_LABEL"
fi

exec "$N8N_REPO/packages/cli/bin/n8n" start
