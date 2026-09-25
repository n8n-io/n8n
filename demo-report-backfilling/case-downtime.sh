#!/usr/bin/env bash
# Case: the instance was down (or the receiver unreachable) for 45 days after a
# delivered report. Run after the main demo delivered its first report.
#
# It rewrites the newest delivered report so that it covers only the day 46
# days ago, and dates it yesterday. The next report must then carry every day
# since, including days without executions as 0. The old code capped this at 30.
set -euo pipefail
source "$(dirname "$0")/env.sh"

newest=$(sql "SELECT id FROM instance_monitoring_report WHERE status = 'delivered' ORDER BY createdAt DESC LIMIT 1;")
if [[ -z "$newest" ]]; then
	echo "No delivered report yet. Run the main demo first." >&2
	exit 1
fi

sql <<SQL
DELETE FROM instance_monitoring_report WHERE id <> '$newest';

UPDATE instance_monitoring_report
SET createdAt = datetime('now', '-1 day'),
    deliveredAt = datetime('now', '-1 day'),
    dataPoints = json_array(
      json_object('kind', 'cumulative', 'name', 'billableExecutions', 'value', 0),
      json_object('kind', 'daily', 'name', 'billableExecutions', 'value', 0,
                  'date', date('now', '-46 days')))
WHERE id = '$newest';
SQL

echo "Last delivered day is now $(sql "SELECT date('now', '-46 days');"). Restart n8n with: ./start-n8n.sh reporting"
