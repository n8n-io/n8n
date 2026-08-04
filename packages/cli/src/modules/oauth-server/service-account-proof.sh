#!/usr/bin/env bash
#
# Track 2 (inbound M2M OAuth) — end-to-end proof via curl.
#
# Mints service-account access tokens with grant_type=client_credentials and
# exercises the three inbound surfaces, asserting the expected status on each and
# printing the response body as evidence for the successful calls:
#
#   1. MCP Trigger        POST {BASE}/mcp/{MCP_TRIGGER_PATH}
#   2. Public REST API    GET  {BASE}/api/v1/workflows
#   3. Instance MCP server POST {BASE}/mcp-server/http
#
# For each surface: no-token -> 401, valid token -> 200, and (where applicable) a
# token minted for a DIFFERENT audience -> 401 (audience isolation).
#
# Prerequisites (see SERVICE_ACCOUNT_PROOF.md):
#   - n8n running (default http://localhost:5678)
#   - a service_account_credential seeded (default demo-client / demo-secret via
#     N8N_SEED_DEMO_SERVICE_ACCOUNT=true)
#   - instance MCP enabled (Settings -> MCP, or N8N_MCP_ACCESS_ENABLED=true)
#   - an ACTIVE v2 MCP Trigger workflow (authentication=n8nOAuth2) at the path below
#
# Usage:
#   ./service-account-proof.sh
#   BASE_URL=... CLIENT_ID=... CLIENT_SECRET=... MCP_TRIGGER_PATH=... ./service-account-proof.sh

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:5678}"
CLIENT_ID="${CLIENT_ID:-demo-client}"
CLIENT_SECRET="${CLIENT_SECRET:-demo-secret}"
MCP_TRIGGER_PATH="${MCP_TRIGGER_PATH:-test}"

TOKEN_URL="$BASE_URL/oauth/token"
TRIGGER_RES="$BASE_URL/mcp/$MCP_TRIGGER_PATH"
INSTANCE_RES="$BASE_URL/mcp-server/http"
API_RES="$BASE_URL/api/v1"

INIT_BODY='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl-proof","version":"1.0"}}}'

if [ -t 1 ]; then G=$'\e[32m'; R=$'\e[31m'; Y=$'\e[33m'; B=$'\e[1m'; D=$'\e[2m'; N=$'\e[0m'; else G=; R=; Y=; B=; D=; N=; fi

PASS=0; FAIL=0
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# Extract a top-level JSON string field ("field":"value") from stdin. Portable
# (BSD/GNU) — avoids sed branch labels.
json_field() { grep -oE "\"$1\":\"[^\"]*\"" | head -n1 | cut -d'"' -f4; }

# Mint an access token for the given resource (audience). Prints the token or "".
mint() {
	curl -sS -X POST "$TOKEN_URL" \
		-H 'Content-Type: application/x-www-form-urlencoded' \
		-d grant_type=client_credentials \
		-d "client_id=$CLIENT_ID" -d "client_secret=$CLIENT_SECRET" \
		--data-urlencode "resource=$1" | json_field access_token
}

# Best-effort decode of a JWT payload (base64url) to JSON.
decode_claims() {
	local p; p="$(printf '%s' "$1" | cut -d. -f2 | tr '_-' '/+')"
	case $(( ${#p} % 4 )) in 2) p="$p==";; 3) p="$p=";; esac
	printf '%s' "$p" | { base64 -d 2>/dev/null || base64 -D 2>/dev/null; }
}

# call METHOD URL [TOKEN] -> writes response body to $TMP/body, echoes HTTP status.
call() {
	local m="$1" url="$2" token="${3:-}"
	local args=(-sS -o "$TMP/body" -w '%{http_code}' -X "$m"
		-H 'Accept: application/json, text/event-stream'
		-H 'Content-Type: application/json')
	[ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
	[ "$m" = POST ] && args+=(--data "$INIT_BODY")
	curl "${args[@]}" "$url"
}

# record NAME EXPECTED ACTUAL [EVIDENCE_FILE]
record() {
	if [ "$3" = "$2" ]; then
		printf '  %sPASS%s %s %s(HTTP %s)%s\n' "$G" "$N" "$1" "$D" "$3" "$N"
		PASS=$((PASS+1))
		if [ -n "${4:-}" ] && [ -s "$4" ]; then
			printf '       %s↳ %s%s\n' "$D" "$(tr -d '\r' < "$4" | tr '\n' ' ' | head -c 220)" "$N"
		fi
	else
		printf '  %sFAIL%s %s %s(expected %s, got %s)%s\n' "$R" "$N" "$1" "$B" "$2" "$3" "$N"
		FAIL=$((FAIL+1))
		[ -n "${4:-}" ] && [ -s "$4" ] && printf '       ↳ %s\n' "$(tr -d '\r' < "$4" | tr '\n' ' ' | head -c 220)"
	fi
}

section() { printf '\n%s%s%s\n' "$B" "$1" "$N"; }

printf '%sTrack 2 — service-account client_credentials proof%s\n' "$B" "$N"
printf '%sbase=%s  client_id=%s  trigger=/mcp/%s%s\n' "$D" "$BASE_URL" "$CLIENT_ID" "$MCP_TRIGGER_PATH" "$N"

section '1) Mint tokens (grant_type=client_credentials)'
TOK_TRIGGER="$(mint "$TRIGGER_RES")"
TOK_INSTANCE="$(mint "$INSTANCE_RES")"
TOK_API="$(mint "$API_RES")"

if [ -z "$TOK_TRIGGER" ] || [ -z "$TOK_INSTANCE" ] || [ -z "$TOK_API" ]; then
	printf '  %sFAIL%s could not mint a token. Is n8n up and the credential seeded?\n' "$R" "$N"
	printf '       ↳ raw mint response:\n'
	curl -sS -X POST "$TOKEN_URL" -H 'Content-Type: application/x-www-form-urlencoded' \
		-d grant_type=client_credentials -d "client_id=$CLIENT_ID" -d "client_secret=$CLIENT_SECRET" \
		--data-urlencode "resource=$TRIGGER_RES"; echo
	exit 1
fi
[ -n "$TOK_TRIGGER" ]  && record "mint token: aud=$(decode_claims "$TOK_TRIGGER"  | json_field aud)" ok ok
[ -n "$TOK_INSTANCE" ] && record "mint token: aud=$(decode_claims "$TOK_INSTANCE" | json_field aud)" ok ok
[ -n "$TOK_API" ]      && record "mint token: aud=$(decode_claims "$TOK_API"      | json_field aud)" ok ok
printf '       %sclaims: %s%s\n' "$D" "$(decode_claims "$TOK_TRIGGER")" "$N"

section '2) MCP Trigger  (POST /mcp/'"$MCP_TRIGGER_PATH"')'
record "no token rejected"              401 "$(call POST "$TRIGGER_RES")"
record "valid token accepted"           200 "$(call POST "$TRIGGER_RES" "$TOK_TRIGGER")"  "$TMP/body"
record "cross-audience token rejected"  401 "$(call POST "$TRIGGER_RES" "$TOK_INSTANCE")"

section '3) Public REST API  (GET /api/v1/workflows)'
record "no token rejected"              401 "$(call GET "$API_RES/workflows")"
record "valid token accepted"           200 "$(call GET "$API_RES/workflows" "$TOK_API")" "$TMP/body"
record "cross-audience token rejected"  401 "$(call GET "$API_RES/workflows" "$TOK_TRIGGER")"

section '4) Instance MCP server  (POST /mcp-server/http)'
record "no token rejected"              401 "$(call POST "$INSTANCE_RES")"
inst_code="$(call POST "$INSTANCE_RES" "$TOK_INSTANCE")"
record "valid token accepted"           200 "$inst_code"                                  "$TMP/body"
[ "$inst_code" != 200 ] && printf '       %shint: enable the instance MCP server (Settings -> MCP, or N8N_MCP_ACCESS_ENABLED=true)%s\n' "$Y" "$N"

section 'Summary'
printf '  %s%d passed%s, %s%d failed%s\n' "$G" "$PASS" "$N" "$([ "$FAIL" -gt 0 ] && printf '%s' "$R")" "$FAIL" "$N"
[ "$FAIL" -eq 0 ]
