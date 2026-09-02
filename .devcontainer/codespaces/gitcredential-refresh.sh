#!/bin/sh
# The stock helper reads $GITHUB_TOKEN from the env. Non-login shells do not
# have it, and the token rotates. Read the current token, then delegate.
[ "$1" = get ] || exit 0
. /usr/local/lib/codespaces-env.sh
exec /.codespaces/bin/gitcredential_github.sh "$@"
