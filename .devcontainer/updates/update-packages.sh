#!/bin/bash
echo "=== PYTHON PACKAGES UPDATE ==="
cd "$(dirname "$0")/.."
echo "python_status=updating" | docker-compose exec -T n8n-advanced tee /home/node/.n8n/python-status
if docker-compose exec n8n-advanced pip install --upgrade -r /tmp/requirements.txt --break-system-packages; then
    echo "python_status=ready" | docker-compose exec -T n8n-advanced tee /home/node/.n8n/python-status
    echo "=== PACKAGES UPDATE COMPLETED ==="
else
    echo "python_status=failed" | docker-compose exec -T n8n-advanced tee /home/node/.n8n/python-status
    echo "=== PACKAGES UPDATE FAILED ==="
fi