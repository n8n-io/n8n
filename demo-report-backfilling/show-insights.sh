#!/usr/bin/env bash
# What insights holds, and the daily points the first report should carry.
set -euo pipefail
source "$(dirname "$0")/env.sh"

echo "== insights_by_period =="
sql -header -column "
	SELECT CASE WHEN periodUnit = 2 THEN 'weekly totals' ELSE 'per day or finer' END AS rows_kind,
	       COUNT(*) AS rows,
	       MIN(date(periodStart)) AS oldest,
	       MAX(date(periodStart)) AS newest
	FROM insights_by_period
	GROUP BY periodUnit = 2
	ORDER BY oldest;"
echo "Raw rows not compacted yet: $(sql 'SELECT COUNT(*) FROM insights_raw;')"
echo

echo "== Expected first report: the last $REPORT_WINDOW_DAYS days, or from the first data if later =="
sql -header -column "
	WITH bounds AS (
		SELECT MIN(
		         COALESCE(
		           MAX(date('now', '-$REPORT_WINDOW_DAYS days'),
		               (SELECT MIN(date(periodStart)) FROM insights_by_period)),
		           date('now', '-1 day')),
		         date('now', '-1 day')) AS first_day,
		       date('now', '-1 day') AS last_day
	),
	window_rows AS (
		SELECT date(periodStart) AS day, value
		FROM insights_by_period, bounds
		WHERE type IN (2, 3) AND date(periodStart) BETWEEN first_day AND last_day
	)
	SELECT CAST(julianday(last_day) - julianday(first_day) + 1 AS INTEGER) AS days,
	       first_day,
	       last_day,
	       (SELECT COALESCE(SUM(value), 0) FROM window_rows) AS executions,
	       CAST(julianday(last_day) - julianday(first_day) + 1 AS INTEGER)
	         - (SELECT COUNT(DISTINCT day) FROM window_rows) AS zero_days
	FROM bounds;"
echo "cumulative = $(sql "SELECT COALESCE(SUM(rootCount), 0) FROM workflow_statistics WHERE name IN ('production_success', 'production_error');")"
