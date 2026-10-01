#!/bin/sh
# gh reads its token from the env only. Long sessions hold a stale snapshot of
# the rotated token. Read the current token on each call, then run the real gh
# (the github-cli feature installs it at /usr/bin/gh).
. /usr/local/lib/codespaces-env.sh
[ -n "$GITHUB_TOKEN" ] && export GH_TOKEN="$GITHUB_TOKEN"
exec /usr/bin/gh "$@"
