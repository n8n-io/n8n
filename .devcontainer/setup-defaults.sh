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