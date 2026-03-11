#!/bin/bash
# Run performance tests against the perf stack.
#
# Usage:
#   pnpm perf:up          # Start the perf stack (clean DB)
#   pnpm perf             # Run k6 tests
#   pnpm perf:down        # Tear down
#
# Prerequisites:
#   - Perf stack running: pnpm perf:up
#   - k6 installed: brew install k6

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_URL="${API_URL:-http://localhost:3101}"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   n8n Engine v2 — Performance Tests      ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# Check k6
if ! command -v k6 &> /dev/null; then
  echo "  Error: k6 not installed"
  echo "  Install with: brew install k6"
  exit 1
fi

# Check perf stack is running
if ! curl -sf "$API_URL/api/workflows" > /dev/null 2>&1; then
  echo "  Error: Perf stack not running at $API_URL"
  echo ""
  echo "  Start it with:"
  echo "    pnpm perf:up"
  echo ""
  echo "  Then run:"
  echo "    pnpm perf"
  echo ""
  echo "  When done:"
  echo "    pnpm perf:down"
  exit 1
fi

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
# k6 output to InfluxDB (v1 compat API on InfluxDB 2.x)
K6_OUT="influxdb=http://localhost:8086/k6"

BASE_URL="$API_URL" k6 run --out "$K6_OUT" "$SCRIPT_DIR/webhook-throughput.js" 2>&1
echo ""

echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Test 2: Execution Latency"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
BASE_URL="$API_URL" WORKFLOW_ID="$WF_ID" k6 run --out "$K6_OUT" "$SCRIPT_DIR/execution-latency.js" 2>&1
echo ""

echo "  ╔══════════════════════════════════════════╗"
echo "  ║   Done. Run 'pnpm perf:down' to stop.   ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Grafana dashboard: http://localhost:3300/d/k6-perf"
echo ""
