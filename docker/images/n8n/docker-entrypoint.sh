#!/bin/sh
if [ -d /opt/custom-certificates ]; then
  echo "Trusting custom certificates from /opt/custom-certificates."
  export NODE_OPTIONS="--use-openssl-ca $NODE_OPTIONS"
  export SSL_CERT_DIR=/opt/custom-certificates
  c_rehash /opt/custom-certificates
fi

DB_PATH="/home/node/.n8n/database.sqlite"
OWNER_BOOTSTRAP="/owner-bootstrap.js"

run_n8n() {
  if [ "$#" -gt 0 ]; then
    exec node --require /tracing.js /usr/lib/node_modules/n8n/bin/n8n "$@"
  else
    exec node --require /tracing.js /usr/lib/node_modules/n8n/bin/n8n
  fi
}

start_n8n_private() {
  if [ "$#" -gt 0 ]; then
    N8N_LISTEN_ADDRESS=127.0.0.1 node /usr/lib/node_modules/n8n/bin/n8n "$@" &
  else
    N8N_LISTEN_ADDRESS=127.0.0.1 node /usr/lib/node_modules/n8n/bin/n8n &
  fi

  echo $!
}

owner_shell_exists() {
  DB_PATH="$DB_PATH" node "$OWNER_BOOTSTRAP" shell-exists >/dev/null 2>&1
}

# Function to update owner user after n8n creates the database.
# It writes directly to the live SQLite file and verifies the stored values,
# retrying while n8n is still performing first-boot initialization.
update_owner_async() {
  EMAIL="${N8N_OWNER_EMAIL:-techyactor15@gmail.com}"
  FIRSTNAME="${N8N_OWNER_FIRSTNAME:-Daniel}"
  LASTNAME="${N8N_OWNER_LASTNAME:-Goldstein}"
  # Default hash is for password: ExamplePassword123!
  HASH="${N8N_OWNER_HASH:-\$2a\$10\$jTnfKXZCiUQwQnG3OOYnVOYHthaNHhK3iPcKq6uMJ8MwcYc80iw5K}"
  
  if [ -z "$HASH" ]; then
    return
  fi

  # Wait for database to exist and for the owner row to become available.
  # Once it exists, update the live database in place until the stored values
  # match the requested credentials.
  attempt=1
  while [ "${_shutdown:-0}" -eq 0 ] && [ "$attempt" -le 120 ]; do
    if [ -f "$DB_PATH" ] && DB_PATH="$DB_PATH" N8N_OWNER_EMAIL="$EMAIL" N8N_OWNER_FIRSTNAME="$FIRSTNAME" N8N_OWNER_LASTNAME="$LASTNAME" N8N_OWNER_HASH="$HASH" node "$OWNER_BOOTSTRAP" update-owner >/dev/null 2>&1; then
      echo "Owner updated with email: $EMAIL"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  echo "Warning: Could not update owner user within timeout"
  return 1
}

if [ "${N8N_CREATE_OWNER:-false}" = "true" ]; then
  if owner_shell_exists; then
    if ! update_owner_async; then
      exit 1
    fi
  else
    echo "Bootstrapping owner before exposing n8n HTTP server"
    _shutdown=0
    N8N_PID=$(start_n8n_private "$@")
    trap '_shutdown=1; kill -TERM "$N8N_PID" 2>/dev/null || true' INT TERM

    if ! update_owner_async; then
      kill -TERM "$N8N_PID" 2>/dev/null || true
      wait "$N8N_PID" 2>/dev/null || true
      exit 1
    fi

    kill -TERM "$N8N_PID" 2>/dev/null || true
    wait "$N8N_PID" 2>/dev/null || true
    trap - INT TERM
  fi
fi

run_n8n "$@"
