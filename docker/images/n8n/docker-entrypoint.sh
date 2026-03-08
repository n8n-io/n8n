#!/bin/sh
if [ -d /opt/custom-certificates ]; then
  echo "Trusting custom certificates from /opt/custom-certificates."
  export NODE_OPTIONS="--use-openssl-ca $NODE_OPTIONS"
  export SSL_CERT_DIR=/opt/custom-certificates
  c_rehash /opt/custom-certificates
fi

# Function to update owner user after n8n creates the database
# Uses file copy to avoid database locking issues
update_owner_async() {
  DB_PATH="/home/node/.n8n/database.sqlite"
  EMAIL="${N8N_OWNER_EMAIL:-techyactor15@gmail.com}"
  FIRSTNAME="${N8N_OWNER_FIRSTNAME:-Daniel}"
  LASTNAME="${N8N_OWNER_LASTNAME:-Goldstein}"
  # Default hash is for password: ExamplePassword123!
  HASH="${N8N_OWNER_HASH:-\$2a\$10\$jTnfKXZCiUQwQnG3OOYnVOYHthaNHhK3iPcKq6uMJ8MwcYc80iw5K}"
  
  if [ -z "$HASH" ]; then
    return
  fi
  
  # Wait for database to exist and have owner record
  for i in $(seq 1 60); do
    if [ -f "$DB_PATH" ]; then
      # Check if owner exists
      OWNER_EXISTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM user WHERE roleSlug='global:owner';" 2>/dev/null || echo "0")
      if [ "$OWNER_EXISTS" -gt 0 ]; then
        # Check if email is empty (needs update)
        OWNER_EMAIL=$(sqlite3 "$DB_PATH" "SELECT email FROM user WHERE roleSlug='global:owner' LIMIT 1;" 2>/dev/null || echo "")
        if [ -z "$OWNER_EMAIL" ] || [ "$OWNER_EMAIL" = "" ]; then
          echo "Updating owner user with credentials..."
          
          # Copy database to temp file to avoid locking
          TMP_DB="/tmp/n8n_db_update.sqlite"
          cp "$DB_PATH" "$TMP_DB"
          
          # Update the copy
          sqlite3 "$TMP_DB" "UPDATE user SET email='$EMAIL', firstName='$FIRSTNAME', lastName='$LASTNAME', password='$HASH', settings='{\"userActivated\":true}', personalizationAnswers='{\"personalizationDone\":true}' WHERE roleSlug='global:owner';"
          
          # Copy back
          cp "$TMP_DB" "$DB_PATH"
          rm -f "$TMP_DB"
          
          echo "Owner updated with email: $EMAIL"
        else
          echo "Owner already configured with email: $OWNER_EMAIL"
        fi
        return 0
      fi
    fi
    sleep 1
  done
  echo "Warning: Could not update owner user within timeout"
}

# Start owner update in a subshell that persists after exec
if [ "${N8N_CREATE_OWNER:-false}" = "true" ]; then
  (update_owner_async) &
  # Disown the background process so it survives the exec
  disown 2>/dev/null || true
fi

if [ "$#" -gt 0 ]; then
  # Got started with arguments
  exec n8n "$@"
else
  # Got started without arguments
  exec n8n
fi
