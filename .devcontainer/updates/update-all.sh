#!/bin/bash
echo "=== UPDATING ALL COMPONENTS ==="
cd "$(dirname "$0")"
bash ./update-postgres.sh
bash ./update-n8n.sh  
bash ./update-packages.sh
echo "=== ALL UPDATES COMPLETED ==="