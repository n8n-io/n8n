#!/usr/bin/env bash
# One-command install of football-intel on a Debian or Ubuntu VPS (run as root).
#
#   curl -fsSL https://raw.githubusercontent.com/benkas418-alt/n8n/claude/branche-higgsfield-974raq/football-intel/deploy/install.sh | sudo bash
#
# Safe to run again: it updates the code and keeps .env, the database and the data.
# Keys are asked on the terminal with hidden input; they go only into /opt/football-intel/.env.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/benkas418-alt/n8n.git}"
BRANCH="${BRANCH:-claude/branche-higgsfield-974raq}"
SRC=/opt/footintel-repo
APP=/opt/football-intel
APP_USER=footintel
# Set SKIP_BOOTSTRAP=1 to install without the first data load; SKIP_SYSTEMD=1 without services.
SKIP_BOOTSTRAP="${SKIP_BOOTSTRAP:-0}"
SKIP_SYSTEMD="${SKIP_SYSTEMD:-0}"

say() { printf '\n==> %s\n' "$*"; }
ask() {  # ask VAR "question" [hidden]: read from the terminal even when piped from curl
  local var=$1 q=$2 hidden=${3:-} ans=""
  # /dev/tty can exist without a terminal behind it (cron, CI): test that it opens.
  if { : </dev/tty; } 2>/dev/null; then
    printf '%s' "$q" >/dev/tty
    if [ -n "$hidden" ]; then read -rs ans </dev/tty || true; printf '\n' >/dev/tty
    else read -r ans </dev/tty || true; fi
  fi
  printf -v "$var" '%s' "$ans"
}
set_env() {  # set_env KEY VALUE: replace or append one line of .env, value never printed
  local key=$1 val=$2 f=$APP/.env
  [ -z "$val" ] && return 0
  if grep -q "^${key}=" "$f"; then
    KEY="$key" VAL="$val" python3 - "$f" <<'PY'
import os, sys
p = sys.argv[1]; k, v = os.environ["KEY"], os.environ["VAL"]
lines = open(p).read().splitlines()
open(p, "w").write("\n".join(f"{k}={v}" if l.startswith(f"{k}=") else l for l in lines) + "\n")
PY
  else
    printf '%s=%s\n' "$key" "$val" >>"$f"
  fi
}
as_app() { (cd "$APP" && runuser -u "$APP_USER" -- "$@"); }

[ "$(id -u)" -eq 0 ] || { echo "Run as root: ... | sudo bash" >&2; exit 1; }
command -v apt-get >/dev/null || { echo "Debian or Ubuntu required (apt-get not found)." >&2; exit 1; }

say "System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates postgresql python3 openssl >/dev/null
systemctl enable --now postgresql >/dev/null 2>&1 || service postgresql start

id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/footintel \
  --shell /usr/sbin/nologin "$APP_USER"

say "Code ($BRANCH)"
# The repository is large: fetch only the football-intel folder.
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch -q --depth 1 origin "$BRANCH"
  git -C "$SRC" checkout -q -B "$BRANCH" FETCH_HEAD
else
  git clone -q --depth 1 --filter=blob:none --sparse -b "$BRANCH" "$REPO_URL" "$SRC"
  git -C "$SRC" sparse-checkout set football-intel
fi
ln -sfn "$SRC/football-intel" "$APP"
chown -R "$APP_USER:$APP_USER" "$SRC"
git config --system --add safe.directory "$SRC" 2>/dev/null || true

say "Python environment (uv)"
if [ ! -x /usr/local/bin/uv ]; then
  curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin UV_NO_MODIFY_PATH=1 sh >/dev/null
fi
export UV_PYTHON_INSTALL_DIR=/opt/footintel-python UV_CACHE_DIR=/var/cache/footintel-uv
mkdir -p "$UV_PYTHON_INSTALL_DIR" "$UV_CACHE_DIR"
chown "$APP_USER:$APP_USER" "$UV_PYTHON_INSTALL_DIR" "$UV_CACHE_DIR"
as_app env UV_PYTHON_INSTALL_DIR="$UV_PYTHON_INSTALL_DIR" UV_CACHE_DIR="$UV_CACHE_DIR" \
  /usr/local/bin/uv venv -q --allow-existing --python 3.13 .venv
as_app env UV_CACHE_DIR="$UV_CACHE_DIR" /usr/local/bin/uv pip install -q --python .venv/bin/python -e .

say "Database"
if [ ! -f "$APP/.env" ]; then
  install -m 600 -o "$APP_USER" -g "$APP_USER" "$APP/.env.example" "$APP/.env"
  DB_PASS=$(openssl rand -hex 24)
  set_env DATABASE_URL "postgresql+psycopg://footintel:${DB_PASS}@localhost:5432/footintel"
  set_env ADMIN_TOKEN "$(openssl rand -hex 32)"
  set_env DATA_DIR "/var/lib/footintel/data"
  set_env ARTIFACTS_DIR "/var/lib/footintel/artifacts"
  set_env REPORTS_DIR "/var/lib/footintel/reports"
  if runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='footintel'" | grep -q 1; then
    runuser -u postgres -- psql -q -c "ALTER ROLE footintel PASSWORD '${DB_PASS}'"
  else
    runuser -u postgres -- psql -q -c "CREATE ROLE footintel LOGIN PASSWORD '${DB_PASS}'"
  fi
  unset DB_PASS
fi
runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='footintel'" | grep -q 1 \
  || runuser -u postgres -- createdb -O footintel footintel
mkdir -p /var/lib/footintel/{data,artifacts,reports}
chown -R "$APP_USER:$APP_USER" /var/lib/footintel
chmod 600 "$APP/.env"; chown "$APP_USER:$APP_USER" "$APP/.env"

say "API keys (press Enter to skip or keep the current one)"
for k in FOOTBALL_DATA_ORG_KEY ODDS_API_KEY TELEGRAM_BOT_TOKEN; do
  current=$(grep -E "^${k}=." "$APP/.env" >/dev/null && echo "set" || echo "empty")
  ask val "  $k ($current): " hidden
  set_env "$k" "$val"
done
ask val "  TELEGRAM_CHAT_ID: "
set_env TELEGRAM_CHAT_ID "$val"
unset val

as_app .venv/bin/footintel db upgrade >/dev/null
as_app .venv/bin/footintel db seed >/dev/null

if [ "$SKIP_SYSTEMD" != "1" ]; then
  say "Services"
  cp "$APP/deploy/footintel-api.service" "$APP/deploy/footintel-scheduler.service" /etc/systemd/system/
  cat >/etc/systemd/system/footintel-bootstrap.service <<EOF
[Unit]
Description=footintel first data load, model training and first predictions
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=oneshot
User=$APP_USER
WorkingDirectory=$APP
EnvironmentFile=$APP/.env
ExecStart=$APP/deploy/bootstrap.sh
TimeoutStartSec=6h
EOF
  systemctl daemon-reload
  systemctl enable --now footintel-api footintel-scheduler >/dev/null
  systemctl restart footintel-api footintel-scheduler
  if [ "$SKIP_BOOTSTRAP" != "1" ] && [ ! -f /var/lib/footintel/.bootstrapped ]; then
    systemctl start --no-block footintel-bootstrap
    BOOT="started"
  fi
fi

ask domain "Domain for HTTPS access (Enter to skip, e.g. monfoot.duckdns.org): "
if [ -n "${domain:-}" ]; then
  say "Caddy (HTTPS and password)"
  if ! command -v caddy >/dev/null; then
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https gnupg >/dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
      | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
      >/etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq && apt-get install -y -qq caddy >/dev/null
  fi
  ask login "  Login for the dashboard: "
  ask pass "  Password (hidden): " hidden
  hash=$(caddy hash-password --plaintext "$pass")
  unset pass
  sed -e "s|CHANGE_ME_DOMAIN|$domain|" -e "s|CHANGE_ME_USER|$login|" -e "s|CHANGE_ME_PASSWORD_HASH|$hash|" \
    "$APP/deploy/Caddyfile" >/etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
  systemctl reload caddy || systemctl restart caddy
  URL="https://$domain/dashboard/"
fi

say "Done"
echo "  Code:        $APP (branch $BRANCH)"
echo "  Settings:    $APP/.env (edit with: sudo nano $APP/.env, then sudo systemctl restart footintel-api footintel-scheduler)"
echo "  Dashboard:   ${URL:-ssh -L 8000:127.0.0.1:8000 <user>@<vps>, then http://127.0.0.1:8000/dashboard/}"
echo "  Admin token: sudo grep ADMIN_TOKEN $APP/.env"
if [ "${BOOT:-}" = "started" ]; then
  echo "  First data load runs in the background (about 1 hour). Follow it with:"
  echo "    sudo journalctl -fu footintel-bootstrap"
fi
echo "  Update later: run the same command again."
