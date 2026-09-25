#!/usr/bin/env bash
# Seeds SEED_DAYS days of execution history as raw insights rows, as if the
# demo workflow had run in production all that time. The running instance's
# compaction (every minute) then folds them like real data:
#   last 90 days   -> hourly rows
#   90-180 days    -> daily rows
#   over 180 days  -> weekly rows
#
# Pattern, so values are easy to recognise on screen:
#   weekday: 30-36 succeeded + 0-2 failed
#   weekend: 6 succeeded
#   10-12 days ago: no executions at all (a quiet stretch inside the history)
#
# It also sets workflow_statistics to the same lifetime totals, because the
# report's `cumulative` point reads those.
set -euo pipefail
source "$(dirname "$0")/env.sh"

sql <<SQL
PRAGMA foreign_keys = ON;

-- Re-runnable: drop earlier seeded insights and statistics.
DELETE FROM insights_raw;
DELETE FROM insights_by_period;
DELETE FROM workflow_statistics;

INSERT OR IGNORE INTO insights_metadata (workflowId, projectId, workflowName, projectName)
SELECT w.id, p.id, w.name, p.name
FROM workflow_entity w
JOIN shared_workflow s ON s.workflowId = w.id AND s.role = 'workflow:owner'
JOIN project p ON p.id = s.projectId
WHERE w.id = '$DEMO_WORKFLOW_ID';

WITH RECURSIVE
	n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < $SEED_DAYS),
	days AS (
		SELECT
			i,
			date('now', '-' || i || ' days') AS day,
			strftime('%w', 'now', '-' || i || ' days') IN ('0', '6') AS weekend
		FROM n
		WHERE i NOT BETWEEN 10 AND 12
	),
	totals AS (
		SELECT
			day,
			CASE WHEN weekend THEN 6 ELSE 30 + i % 7 END AS succeeded,
			CASE WHEN weekend THEN 0 ELSE i % 3 END AS failed
		FROM days
	),
	-- 2 = success, 3 = failure. Spread over the day, including 23:50 UTC,
	-- to show that late executions stay on their own UTC day.
	rows AS (
		SELECT day || ' 09:15:00.000' AS ts, 2 AS type, succeeded / 3 AS value FROM totals
		UNION ALL SELECT day || ' 14:40:00.000', 2, succeeded / 3 FROM totals
		UNION ALL SELECT day || ' 23:50:00.000', 2, succeeded - 2 * (succeeded / 3) FROM totals
		UNION ALL SELECT day || ' 11:00:00.000', 3, failed FROM totals WHERE failed > 0
	)
INSERT INTO insights_raw (metaId, type, value, timestamp)
SELECT m.metaId, r.type, r.value, r.ts
FROM rows r
CROSS JOIN (SELECT metaId FROM insights_metadata WHERE workflowId = '$DEMO_WORKFLOW_ID') m
WHERE r.ts <= strftime('%Y-%m-%d %H:%M:%f', 'now');

INSERT INTO workflow_statistics (name, workflowId, workflowName, count, rootCount, latestEvent)
SELECT
	CASE type WHEN 2 THEN 'production_success' ELSE 'production_error' END,
	'$DEMO_WORKFLOW_ID', 'Nightly CRM sync', SUM(value), SUM(value), MAX(timestamp)
FROM insights_raw
GROUP BY type;
SQL

echo "Seeded raw insights rows:"
sql -header -column "
	SELECT CASE type WHEN 2 THEN 'success' ELSE 'failure' END AS type,
	       COUNT(*) AS rows, SUM(value) AS executions,
	       MIN(date(timestamp)) AS first_day, MAX(date(timestamp)) AS last_day
	FROM insights_raw GROUP BY type;"
echo
echo "Compaction runs every minute. Then run ./show-insights.sh"
