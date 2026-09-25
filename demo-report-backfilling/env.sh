# Shared settings for the demo scripts. The scripts source this file; you do not
# need to source it yourself.

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export N8N_REPO="${N8N_REPO:-$(cd "$DEMO_DIR/.." && pwd)}"
export RECEIVER_REPO="${RECEIVER_REPO:-$HOME/dev/airgap-monitoring}"

# A throwaway n8n home, so your normal ~/.n8n stays untouched.
export N8N_USER_FOLDER="${DEMO_HOME:-$DEMO_DIR/n8n-home}"
export N8N_DB="$N8N_USER_FOLDER/.n8n/database.sqlite"
export N8N_PORT="${N8N_PORT:-5678}"

# The receiver (airgap-monitoring) in token mode: no license certificate needed.
export RECEIVER_URL="http://127.0.0.1:3456"
export RECEIVER_DB="$DEMO_DIR/receiver.sqlite"
export WRITE_TOKEN="demo-write-token"
export READ_TOKEN="demo-read-token"
export DEMO_LABEL="${DEMO_LABEL:-video-demo}"

# The only insights change for the demo: compact every minute instead of every hour.
# The compaction thresholds keep their defaults (hour->day after 90 days,
# day->week after 180 days), so the data looks like a real instance's.
export N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES=1

# A report reaches back one day less than the day->week compaction threshold.
REPORT_WINDOW_DAYS=$(( ${N8N_INSIGHTS_COMPACTION_DAILY_TO_WEEKLY_THRESHOLD_DAYS:-180} - 1 ))

export DEMO_WORKFLOW_ID="demoWorkflow0001"

# The seeded history covers this many days before today.
export SEED_DAYS="${SEED_DAYS:-200}"

sql() { sqlite3 -cmd ".timeout 5000" "$N8N_DB" "$@"; }
