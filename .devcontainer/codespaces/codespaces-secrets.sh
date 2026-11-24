# Interactive shell sessions set this guard after they remove worker credentials.
[ "${N8N_SKIP_CODESPACE_SECRETS:-}" = "1" ] && return

# Login-shell setup for ssh/tmux sessions: export secrets, then do the
# one-time registrations.
. /usr/local/lib/codespaces-env.sh

# Claude Code keeps its first-run state in ~/.claude.json. Write the defaults
# so a new codespace does not show the theme and trust prompts. The env
# secrets supply the login.
[ -f "$HOME/.claude.json" ] || printf '%s\n' \
	'{"hasCompletedOnboarding":true,"theme":"dark","projects":{"/workspaces/n8n":{"hasTrustDialogAccepted":true}}}' \
	>"$HOME/.claude.json"

# Register the credential helper in the user config, because Codespaces
# regenerates the managed /etc/gitconfig. When the env token is missing, the
# system helper exits 0 without output, and git falls through to ours.
if command -v git >/dev/null 2>&1 &&
	! git config --global --get-all credential.helper 2>/dev/null | grep -qs gitcredential-refresh; then
	git config --global --add credential.helper /usr/local/bin/gitcredential-refresh.sh
fi
