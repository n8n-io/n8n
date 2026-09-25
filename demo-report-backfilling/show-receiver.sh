#!/usr/bin/env bash
# The newest report the receiver stored for the demo instance, from its export.
# Pass `all` to print every daily point instead of the first and last five.
set -euo pipefail
source "$(dirname "$0")/env.sh"

curl -sS "$RECEIVER_URL/api/v1/report" -H "authorization: Bearer $READ_TOKEN" |
	jq -r --arg label "$DEMO_LABEL" --arg mode "${1:-short}" '
		.data.instances[]
		| select(.label == $label)
		| .dataPoints.billableExecutions as $points
		| ($points | max_by(.receivedAt) | .batchId) as $batch
		| [$points[] | select(.batchId == $batch)] as $report
		| [$report[] | select(.kind == "daily")] as $daily
		| ($daily | map("  \(.date)  \(.value)")) as $lines
		| "instance:    \(.instanceId[0:12])…  label: \(.label)",
		  "batch:       \($batch)",
		  "cumulative:  \([$report[] | select(.kind == "cumulative") | .value] | first)",
		  "daily:       \($daily | length) points, \($daily[0].date) .. \($daily[-1].date)",
		  "sum(daily):  \($daily | map(.value) | add)",
		  "zero days:   \([$daily[] | select(.value == 0) | .date] | join(", "))",
		  "",
		  if $mode == "all" or ($lines | length) <= 10
		  then $lines[]
		  else ($lines[0:5][], "  …", $lines[-5:][])
		  end
	'
