# Codespaces delivers user secrets base64-encoded to a shared env file and only
# injects them into VS Code sessions; ssh/tmux login shells must source them here.
if [ -f /workspaces/.codespaces/shared/.env-secrets ]; then
	while IFS='=' read -r key val; do
		case "$key" in '' | *[!A-Za-z0-9_]*) continue ;; esac
		dec=$(printf %s "$val" | base64 -d 2>/dev/null) && export "$key=$dec"
	done </workspaces/.codespaces/shared/.env-secrets
fi
