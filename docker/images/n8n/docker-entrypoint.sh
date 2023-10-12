#!/bin/sh
<<<<<<< HEAD
bash -c "chmod +x /install-custom-modules.sh && /install-custom-modules.sh"

=======
>>>>>>> upstream/master
if [ "$#" -gt 0 ]; then
  # Got started with arguments
  exec n8n "$@"
else
  # Got started without arguments
  exec n8n
fi
