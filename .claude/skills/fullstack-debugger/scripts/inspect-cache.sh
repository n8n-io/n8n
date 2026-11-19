#!/bin/bash
# Cache Inspection Script
# Inspects Cloudflare KV cache for meeting-proxy

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# KV Namespace IDs (update these for your project)
MEETING_CACHE_NS="${MEETING_CACHE_NS:-104a373dda314cfc8d267b4b2ffa92b9}"
RATE_LIMIT_NS="${RATE_LIMIT_NS:-7ed18d6c32334aaeb3450ad6e140c985}"

echo "╔════════════════════════════════════════════╗"
echo "║         CACHE INSPECTION TOOL              ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check wrangler auth
if ! npx wrangler whoami > /dev/null 2>&1; then
  echo -e "${YELLOW}Not authenticated with Cloudflare. Run: npx wrangler login${NC}"
  exit 1
fi

# Function to list KV keys
list_kv_keys() {
  local NS_ID=$1
  local NS_NAME=$2
  echo -e "\n${BLUE}=== $NS_NAME ===${NC}"
  echo "Namespace ID: $NS_ID"
  echo ""

  KEYS=$(npx wrangler kv:key list --namespace-id="$NS_ID" 2>/dev/null || echo "[]")

  if [ "$KEYS" = "[]" ]; then
    echo "  (empty)"
  else
    echo "$KEYS" | jq -r '.[].name' 2>/dev/null | head -20 || echo "$KEYS" | head -20

    COUNT=$(echo "$KEYS" | jq 'length' 2>/dev/null || echo "?")
    echo ""
    echo "Total keys: $COUNT"
    if [ "$COUNT" -gt 20 ]; then
      echo "(showing first 20)"
    fi
  fi
}

# Function to get a specific key
get_kv_value() {
  local NS_ID=$1
  local KEY=$2
  echo -e "\n${BLUE}=== Value for '$KEY' ===${NC}"
  VALUE=$(npx wrangler kv:key get --namespace-id="$NS_ID" "$KEY" 2>/dev/null)

  if [ -z "$VALUE" ]; then
    echo "(not found or empty)"
  else
    # Pretty print if JSON
    if echo "$VALUE" | jq . > /dev/null 2>&1; then
      echo "$VALUE" | jq '.' | head -50
      LEN=$(echo "$VALUE" | wc -c)
      if [ "$LEN" -gt 5000 ]; then
        echo "... (truncated, total $LEN bytes)"
      fi
    else
      echo "$VALUE" | head -20
    fi
  fi
}

# Function to check cache hit rate
check_cache_status() {
  local LAT=$1
  local LNG=$2
  local RADIUS=${3:-25}

  echo -e "\n${BLUE}=== Cache Status Check ===${NC}"
  echo "Location: ($LAT, $LNG), Radius: ${RADIUS}mi"

  RESPONSE=$(curl -s -D - -o /dev/null \
    -H "Origin: https://jbuds4life.pages.dev" \
    "https://jb4l-meeting-proxy.erich-owens.workers.dev/api/all?lat=$LAT&lng=$LNG&radius=$RADIUS" 2>&1)

  CACHE=$(echo "$RESPONSE" | grep -i "x-cache:" | tr -d '\r' || echo "x-cache: unknown")
  GEOHASH=$(echo "$RESPONSE" | grep -i "x-geohash:" | tr -d '\r' || echo "x-geohash: unknown")
  SOURCE=$(echo "$RESPONSE" | grep -i "x-source:" | tr -d '\r' || echo "")

  echo "$CACHE"
  echo "$GEOHASH"
  [ -n "$SOURCE" ] && echo "$SOURCE"
}

# Main menu
case "${1:-list}" in
  list)
    list_kv_keys "$MEETING_CACHE_NS" "Meeting Cache"
    ;;

  rate)
    list_kv_keys "$RATE_LIMIT_NS" "Rate Limits"
    ;;

  get)
    if [ -z "$2" ]; then
      echo "Usage: $0 get <key>"
      exit 1
    fi
    get_kv_value "$MEETING_CACHE_NS" "$2"
    ;;

  status)
    LAT="${2:-45.5152}"
    LNG="${3:--122.6784}"
    check_cache_status "$LAT" "$LNG"
    ;;

  warm)
    echo "Warming cache for top metros..."
    curl -s -H "Origin: https://jbuds4life.pages.dev" \
      "https://jb4l-meeting-proxy.erich-owens.workers.dev/warm"
    echo ""
    ;;

  clear)
    if [ -z "$2" ]; then
      echo "Usage: $0 clear <key>"
      echo "       $0 clear meetings:c20  # Clear Portland cache"
      exit 1
    fi
    echo "Deleting key: $2"
    npx wrangler kv:key delete --namespace-id="$MEETING_CACHE_NS" "$2"
    echo -e "${GREEN}Deleted${NC}"
    ;;

  *)
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  list              List meeting cache keys"
    echo "  rate              List rate limit keys"
    echo "  get <key>         Get value for a key"
    echo "  status [lat lng]  Check cache status for location"
    echo "  warm              Warm cache for top metros"
    echo "  clear <key>       Delete a cache key"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 get meetings:c20:25"
    echo "  $0 status 45.52 -122.68"
    echo "  $0 clear meetings:c20:25"
    ;;
esac
