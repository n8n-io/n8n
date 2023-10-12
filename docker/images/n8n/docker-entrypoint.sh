#!/bin/sh
bash -c "chmod +x /install-custom-modules.sh && /install-custom-modules.sh"

if [ "$#" -gt 0 ]; then
  # Got started with arguments
  exec n8n "$@"
else
  # Got started without arguments
  exec n8n
fi
