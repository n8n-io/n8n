#!/usr/bin/env bash
# The instance's own record of its reports.
set -euo pipefail
source "$(dirname "$0")/env.sh"

sql -header -column "
	SELECT substr(id, 1, 8) AS batch, status, attempts,
	       strftime('%Y-%m-%d %H:%M', createdAt) AS created,
	       (SELECT COUNT(*) FROM json_each(dataPoints) WHERE json_extract(value, '$.kind') = 'daily') AS daily_points,
	       (SELECT MIN(json_extract(value, '$.date')) FROM json_each(dataPoints)) AS first_day,
	       (SELECT MAX(json_extract(value, '$.date')) FROM json_each(dataPoints)) AS last_day
	FROM instance_monitoring_report
	ORDER BY createdAt;"
