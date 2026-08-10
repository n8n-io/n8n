# Login-shell setup for ssh/tmux sessions: export secrets, then do the
# one-time registrations.
. /usr/local/lib/codespaces-env.sh

# Register the Flaky MCP server for Claude Code. The config keeps a literal
# ${FLAKY_MCP_TOKEN}; Claude Code expands it at connect time, so the token is
# not written to disk. Forks have no repo secrets and skip this.
if [ -n "$FLAKY_MCP_URL" ] && ! grep -qs '"flaky"' "$HOME/.claude.json" && command -v claude >/dev/null 2>&1; then
	claude mcp add --scope user --transport http flaky "$FLAKY_MCP_URL" \
		--header 'Authorization: Bearer ${FLAKY_MCP_TOKEN}' >/dev/null 2>&1 || true
fi

# Register the credential helper in the user config, because Codespaces
# regenerates the managed /etc/gitconfig. When the env token is missing, the
# system helper exits 0 without output, and git falls through to ours.
if command -v git >/dev/null 2>&1 &&
	! git config --global --get-all credential.helper 2>/dev/null | grep -qs gitcredential-refresh; then
	git config --global --add credential.helper /usr/local/bin/gitcredential-refresh.sh
fi
