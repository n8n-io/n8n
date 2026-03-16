#!/bin/bash
# Run performance tests against the engine.
#
# Usage:
#   pnpm perf:up          # Start the perf stack (clean DB)
#   pnpm perf             # Run k6 tests (webhook + latency)
#   pnpm perf --scaling   # Run scaling load test (targets scaling stack)
#   pnpm perf:down        # Tear down
#
# The --scaling flag:
#   - Targets localhost:3100 (Traefik LB in front of 3 engine instances)
#   - Runs the scaling-load.js script (ramp to 50 VUs)
#   - Start with: pnpm scaling:up
#
# Environment:
#   API_URL    Override the target URL (default: http://localhost:3100)
#
# Prerequisites:
#   - Stack running: pnpm perf:up (or pnpm scaling:up for --scaling)
#   - k6 installed: brew install k6

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_URL="${API_URL:-http://localhost:3100}"
SCALING_MODE=false

# Parse flags
for arg in "$@"; do
  case $arg in
    --scaling)
      SCALING_MODE=true
      shift
      ;;
  esac
done

if [ "$SCALING_MODE" = true ]; then
  echo ""
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║   n8n Engine v2 — Scaling Load Test      ║"
  echo "  ╚══════════════════════════════════════════╝"
  echo ""
else
  echo ""
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║   n8n Engine v2 — Performance Tests      ║"
  echo "  ╚══════════════════════════════════════════╝"
  echo ""
fi

# Check k6
if ! command -v k6 &> /dev/null; then
  echo "  Error: k6 not installed"
  echo "  Install with: brew install k6"
  exit 1
fi

# Check stack is running
if ! curl -sf "$API_URL/health" > /dev/null 2>&1; then
  echo "  Error: Engine not running at $API_URL"
  echo ""
  if [ "$SCALING_MODE" = true ]; then
    echo "  Start the scaling stack with:"
    echo "    pnpm scaling:up"
  else
    echo "  Start the perf stack with:"
    echo "    pnpm perf:up"
  fi
  echo ""
  echo "  Then run:"
  echo "    pnpm perf"
  echo ""
  echo "  When done:"
  if [ "$SCALING_MODE" = true ]; then
    echo "    pnpm scaling:down"
  else
    echo "    pnpm perf:down"
  fi
  exit 1
fi

# k6 output to InfluxDB (v1 compat API on InfluxDB 2.x)
K6_OUT="influxdb=http://localhost:8086/k6"

if [ "$SCALING_MODE" = true ]; then
  # ---------- Scaling load test ----------
  echo "  Target: $API_URL (scaling deployment)"
  echo ""

  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Scaling Load Test (ramp to 50 VUs)"
  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  BASE_URL="$API_URL" k6 run --out "$K6_OUT" "$SCRIPT_DIR/scaling-load.js" 2>&1
  echo ""

else
  # ---------- Standard perf tests ----------

  # Wait for workflows to be seeded (up to 30s)
  echo "  Waiting for workflows to be seeded..."
  WF_ID=""
  for i in $(seq 1 30); do
    WF_ID=$(curl -sf "$API_URL/api/workflows" 2>/dev/null | node -e "
      let d='';
      process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>{
        const wfs=JSON.parse(d);
        const wh=wfs.find(w=>/webhook/i.test(w.name)&&/echo/i.test(w.name));
        console.log((wh||wfs[0]||{}).id||'');
      });
    " 2>/dev/null)
    if [ -n "$WF_ID" ]; then
      break
    fi
    sleep 1
  done

  if [ -z "$WF_ID" ]; then
    echo "  Error: No workflows found after 30s."
    exit 1
  fi

  curl -sf -X POST "$API_URL/api/workflows/$WF_ID/activate" > /dev/null 2>&1
  echo "  Webhook workflow: $WF_ID (activated)"

  # Warmup
  echo "  Warming up (3 requests)..."
  for i in 1 2 3; do
    curl -sf -X POST "$API_URL/webhook/echo" \
      -H 'Content-Type: application/json' \
      -d '{"message":"warmup"}' -o /dev/null 2>/dev/null || true
    sleep 0.1
  done
  echo ""

  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Test 1: Webhook Throughput"
  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  BASE_URL="$API_URL" k6 run --out "$K6_OUT" "$SCRIPT_DIR/webhook-throughput.js" 2>&1
  echo ""

  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Test 2: Execution Latency"
  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  BASE_URL="$API_URL" WORKFLOW_ID="$WF_ID" k6 run --out "$K6_OUT" "$SCRIPT_DIR/execution-latency.js" 2>&1
  echo ""
fi

echo "  ╔══════════════════════════════════════════╗"
echo "  ║   Done.                                  ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Grafana dashboard: http://localhost:3300/d/k6-perf"
echo ""
