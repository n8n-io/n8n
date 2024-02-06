#!/bin/sh
if [ "$#" -gt 0 ]; then
  # Got started with arguments
  node "$@"
else
  # Got started without arguments
  if [ "$1" = "worker" ]; then
    n8n
    # Run n8n with worker argument
    /bin/sh -c "sleep 5; n8n worker"
  else
    # Run n8n without any additional arguments
    n8n
  fi
fi
