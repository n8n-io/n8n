#!/usr/bin/env bash
# Reinstall the tools that live outside the repository in a fresh cloud container.
# Safe to run again: each step is skipped when its tool already works.
# Use as the environment setup script, or run: bash football-intel/scripts/claude-cloud-setup.sh
set -uo pipefail

TOOLS=${CLAUDE_TOOLS_DIR:-/home/user/tools}
SRC=$TOOLS/src
V=$TOOLS/venvs
mkdir -p "$SRC" "$V"
step() { printf '\n==> %s\n' "$*"; }

# A recent uv: the image ships an old one that cannot install Python 3.14.
step "uv"
if [ ! -x "$V/uvnew/bin/uv" ]; then
  python3 -m venv "$V/uvnew" && "$V/uvnew/bin/pip" install -q -U uv
fi
UV=$V/uvnew/bin/uv

clone() {  # clone REPO DIR: shallow clone once
  [ -d "$SRC/$2" ] || git clone -q --depth 1 "https://github.com/$1.git" "$SRC/$2"
}

# soccerdata (football data readers, Apache-2.0).
step "soccerdata"
if ! "$V/soccerdata/bin/python" -c "import soccerdata" >/dev/null 2>&1; then
  clone probberechts/soccerdata soccerdata
  python3 -m venv "$V/soccerdata" && "$V/soccerdata/bin/pip" install -q "$SRC/soccerdata"
fi

# Sofascore scraper (decision D56). Needs Python 3.14: it crashes on 3.13.
step "sofascore_scraper"
if ! "$V/sofascore/bin/ssc" version >/dev/null 2>&1; then
  clone tunjayoff/sofascore_scraper sofascore_scraper
  "$UV" venv -q --python 3.14 "$V/sofascore"
  (cd "$SRC/sofascore_scraper" &&
    VIRTUAL_ENV=$V/sofascore "$UV" pip install -q -r requirements.txt -c constraints.txt &&
    VIRTUAL_ENV=$V/sofascore "$UV" pip install -q -e . &&
    "$V/sofascore/bin/python" -m patchright install chromium --no-shell)
fi

# free-claude-code commands only. Its own installer edits ~/.claude: not used.
step "free-claude-code"
if ! command -v fcc-server >/dev/null 2>&1; then
  clone Alishahryar1/free-claude-code free-claude-code
  "$UV" tool install -q --python 3.14.10 "$SRC/free-claude-code"
fi

# graphify CLI (Apache-2.0): the /graphify skill in .claude/skills calls it.
# Only the CLI: `graphify install` would add Read/Grep hooks to .claude/settings.json.
step "graphify"
if ! command -v graphify >/dev/null 2>&1 && [ ! -x "$HOME/.local/bin/graphify" ]; then
  "$UV" tool install -q graphifyy==0.9.103
fi

step "done"
"$HOME/.local/bin/graphify" --version 2>/dev/null | tail -1
"$V/sofascore/bin/ssc" version 2>/dev/null | tail -1
"$V/soccerdata/bin/python" -c "import soccerdata; print('soccerdata', soccerdata.__version__)" 2>/dev/null | tail -1
command -v fcc-server >/dev/null && echo "free-claude-code ok"
exit 0
