#!/bin/bash
# CORS Diagnostic Script
# Tests if CORS headers are correctly configured on worker endpoints

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
ORIGIN="${1:-https://jbuds4life.pages.dev}"
ENDPOINT="${2:-https://jb4l-meeting-proxy.erich-owens.workers.dev/health}"

echo "╔════════════════════════════════════════════╗"
echo "║         CORS DIAGNOSTIC TOOL               ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Testing: $ENDPOINT"
echo "Origin:  $ORIGIN"
echo ""

# Test 1: Simple GET request
echo "=== Test 1: Simple GET Request ==="
RESPONSE=$(curl -s -D - -o /dev/null -H "Origin: $ORIGIN" "$ENDPOINT")
echo "$RESPONSE" | grep -iE "(HTTP|access-control|x-)" || true

# Check for Access-Control-Allow-Origin
if echo "$RESPONSE" | grep -qi "access-control-allow-origin"; then
  ACAO=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | tr -d '\r')
  echo -e "${GREEN}✅ CORS header present: $ACAO${NC}"
else
  echo -e "${RED}❌ No Access-Control-Allow-Origin header!${NC}"
fi

# Test 2: Preflight OPTIONS request
echo ""
echo "=== Test 2: Preflight OPTIONS Request ==="
PREFLIGHT=$(curl -s -D - -o /dev/null \
  -X OPTIONS \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  "$ENDPOINT")

echo "$PREFLIGHT" | grep -iE "(HTTP|access-control)" || true

# Check preflight response
HTTP_STATUS=$(echo "$PREFLIGHT" | head -1 | awk '{print $2}')
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "204" ]; then
  echo -e "${GREEN}✅ Preflight returns $HTTP_STATUS${NC}"
else
  echo -e "${RED}❌ Preflight returns $HTTP_STATUS (expected 200 or 204)${NC}"
fi

# Check required headers
echo ""
echo "=== Required CORS Headers ==="
for HEADER in "Access-Control-Allow-Origin" "Access-Control-Allow-Methods" "Access-Control-Allow-Headers"; do
  if echo "$PREFLIGHT" | grep -qi "$HEADER"; then
    VALUE=$(echo "$PREFLIGHT" | grep -i "$HEADER" | cut -d: -f2- | tr -d '\r')
    echo -e "${GREEN}✅ $HEADER:$VALUE${NC}"
  else
    echo -e "${RED}❌ Missing: $HEADER${NC}"
  fi
done

# Test 3: Actual POST (if endpoint supports it)
echo ""
echo "=== Test 3: POST Request with JSON ==="
POST_RESPONSE=$(curl -s -D - -o /dev/null \
  -X POST \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  "$ENDPOINT" 2>&1 || true)

POST_STATUS=$(echo "$POST_RESPONSE" | head -1 | awk '{print $2}')
echo "POST Status: $POST_STATUS"
echo "$POST_RESPONSE" | grep -iE "access-control" || echo "(no CORS headers in response)"

# Summary
echo ""
echo "════════════════════════════════════════════"
echo "CORS CHECKLIST"
echo "════════════════════════════════════════════"
cat << 'EOF'
Worker should include in ALL responses (including OPTIONS):

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // or specific origin
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Handle preflight
if (request.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// Add to all other responses
return new Response(body, {
  status: 200,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
EOF
