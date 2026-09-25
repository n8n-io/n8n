#!/usr/bin/env bash
# What insights holds, and the daily points the first report should carry.
set -euo pipefail
source "$(dirname "$0")/env.sh"

echo "== insights_by_period, by bucket size =="
sql -header -column "
	SELECT CASE periodUnit WHEN 0 THEN 'hour' WHEN 1 THEN 'day' WHEN 2 THEN 'week' END AS bucket,
	       COUNT(*) AS rows,
	       MIN(date(periodStart)) AS oldest,
	       MAX(date(periodStart)) AS newest
	FROM insights_by_period
	GROUP BY periodUnit
	ORDER BY periodUnit DESC;"
echo "Raw rows not compacted yet: $(sql 'SELECT COUNT(*) FROM insights_raw;')"
echo

first_exact_day=$(sql "SELECT COALESCE(date(MAX(periodStart), '+7 days'), '(none)') FROM insights_by_period WHERE periodUnit = 2;")
echo "== Expected first report =="
echo "Newest weekly row + 7 days = first exact day: $first_exact_day"
sql -header -column "
	WITH exact AS (
		SELECT date(periodStart) AS day, SUM(value) AS executions
		FROM insights_by_period
		WHERE type IN (2, 3)
		  AND periodUnit IN (0, 1)
		  AND date(periodStart) >= COALESCE(
		        (SELECT date(MAX(periodStart), '+7 days') FROM insights_by_period WHERE periodUnit = 2),
		        '0000-00-00')
		  AND date(periodStart) < date('now')
		GROUP BY day
	)
	SELECT COUNT(*) AS days_with_data, MIN(day) AS first_day, MAX(day) AS last_day,
	       SUM(executions) AS executions
	FROM exact;"
echo "Days from first_day to yesterday without data are sent as 0."
echo "cumulative = $(sql "SELECT SUM(rootCount) FROM workflow_statistics WHERE name IN ('production_success', 'production_error');")"
