#!/usr/bin/env bash
# Makes the next boot with reporting on send the report at once, instead of at
# a random time after 03:00 UTC. It stores 03:00 as the report time, which has
# passed once it is later than 03:00 UTC. Also clears reports sent today, so
# you can re-run a take.
set -euo pipefail
source "$(dirname "$0")/env.sh"

if [[ "$(date -u +%H%M)" < "0301" ]]; then
	echo "It is before 03:01 UTC. The 03:00 slot has not passed yet, so no report would go out." >&2
	exit 1
fi

sql <<'SQL'
INSERT INTO settings (key, value, loadOnStartup)
VALUES ('features.centralInstanceMonitoring', '{"reportTime":"03:00"}', 0)
ON CONFLICT (key) DO UPDATE SET value = excluded.value;

DELETE FROM instance_monitoring_report WHERE createdAt >= date('now');
SQL

echo "Report time set to 03:00 UTC. Restart n8n with: ./start-n8n.sh reporting"
