# Codespaces delivers secrets base64-encoded in a shared env file. It injects
# them into VS Code sessions only. Other shells must source this file to get
# them. Tokens rotate every few minutes: read at time of use, not at login.
if [ -f /workspaces/.codespaces/shared/.env-secrets ]; then
	while IFS='=' read -r key val; do
		case "$key" in '' | *[!A-Za-z0-9_]*) continue ;; esac
		dec=$(printf %s "$val" | base64 -d 2>/dev/null) && export "$key=$dec"
	done </workspaces/.codespaces/shared/.env-secrets
fi
