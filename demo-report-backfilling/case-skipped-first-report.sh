#!/usr/bin/env bash
# Case: the first report yesterday failed three times and was skipped, for
# example because the receiver was not reachable yet.
#
# It deletes all reports and adds one skipped report dated yesterday that
# carried only the day before. Skipped reports never count as delivered, so the
# next report must still start at the first insights data.
set -euo pipefail
source "$(dirname "$0")/env.sh"

id=$(uuidgen | tr '[:upper:]' '[:lower:]')

sql <<SQL
DELETE FROM instance_monitoring_report;

INSERT INTO instance_monitoring_report
  (id, dataPoints, status, deliveredAt, attempts, lastAttemptAt, lastError, createdAt, updatedAt)
VALUES (
  '$id',
  json_array(
    json_object('kind', 'cumulative', 'name', 'billableExecutions', 'value', 0),
    json_object('kind', 'daily', 'name', 'billableExecutions', 'value', 0,
                'date', date('now', '-2 days'))),
  'skipped_after_max_retries', NULL, 3,
  datetime('now', '-1 day'), 'connect ECONNREFUSED 127.0.0.1:3456',
  datetime('now', '-1 day'), datetime('now', '-1 day'));
SQL

./show-n8n-reports.sh
echo
echo "Restart n8n with: ./start-n8n.sh reporting"
