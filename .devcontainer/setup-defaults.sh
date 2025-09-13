#!/bin/sh

echo "=== WAITING FOR POSTGRES ==="
until pg_isready -h postgres -p 5432 -U admin; do
  sleep 2
done

echo "=== STARTING N8N SERVER ==="
n8n &
N8N_PID=$!


echo "=== WAITING FOR N8N TO BE READY ==="
until curl -f http://localhost:5678/healthz >/dev/null 2>&1; do
  sleep 5
done

echo "=== IMPORTING WORKFLOWS ==="
if [ ! -f "/home/node/.n8n/workflows-initialized" ]; then
    n8n import:workflow --input="/usr/src/app/default-workflows/" --separate
    touch /home/node/.n8n/workflows-initialized
fi






echo "=== IMPORTING AND ORGANIZING STATIC WORKFLOWS ==="
if [ -d "/usr/src/app/workflows-static" ]; then
    
    # 1. Ensure the folder exists and get its ID
    FOLDER_NAME="workflows-static"
    # Check if folder already exists
    FOLDER_ID=$(curl -s -u "$N8N_BASIC_AUTH_USER:$N8N_BASIC_AUTH_PASSWORD" "http://localhost:5678/api/v1/workflows/folders?name=${FOLDER_NAME}" | jq -r '.[0].id')

    # If not, create it
    if [ "$FOLDER_ID" = "null" ] || [ -z "$FOLDER_ID" ]; then
        echo "Folder '${FOLDER_NAME}' not found. Creating it."
        FOLDER_ID=$(curl -s -u "$N8N_BASIC_AUTH_USER:$N8N_BASIC_AUTH_PASSWORD" -X POST http://localhost:5678/api/v1/workflows/folders \
          -H "Content-Type: application/json" \
          -d "{\"name\": \"${FOLDER_NAME}\"}" | jq -r '.id')
    else
        echo "Folder '${FOLDER_NAME}' already exists with ID: $FOLDER_ID"
    fi

    # 2. Import/update workflows. They always land in the root directory first.
    n8n import:workflow --input="/usr/src/app/workflows-static/" --separate

    # 3. Move ONLY the just-imported workflows to the folder
    if [ "$FOLDER_ID" != "null" ]; then
        echo "Moving static workflows to folder '${FOLDER_NAME}'..."
        for file in /usr/src/app/workflows-static/*.json; do
            # Get the workflow ID directly from its JSON file
            WORKFLOW_ID=$(jq -r '.id' "$file")
            if [ "$WORKFLOW_ID" != "null" ]; then
                echo "  -> Moving workflow ID ${WORKFLOW_ID} from file $(basename "$file")"
                # Use the API to move the workflow into the correct folder
                curl -s -u "$N8N_BASIC_AUTH_USER:$N8N_BASIC_AUTH_PASSWORD" -X PATCH "http://localhost:5678/api/v1/workflows/${WORKFLOW_ID}" \
                  -H "Content-Type: application/json" \
                  -d "{\"folderId\": \"$FOLDER_ID\"}" > /dev/null
            fi
        done
    else
        echo "ERROR: Could not create or find the folder. Static workflows remain in the root directory."
    fi
fi









echo "=== IMPORTING CREDENTIALS ==="
if [ ! -f "/home/node/.n8n/credentials-initialized" ]; then
    n8n import:credentials --input="/usr/src/app/initial-credentials/" --separate || echo "Credential import failed - will create manually"
    touch /home/node/.n8n/credentials-initialized
fi

echo "=== CHECKING PYTHON PACKAGES ==="
if [ ! -f "/home/node/.n8n/python-setup-done" ]; then
    pip install --upgrade pip setuptools wheel --break-system-packages
    pip install -r /tmp/requirements.txt --break-system-packages
    touch /home/node/.n8n/python-setup-done
fi

wait $N8N_PID