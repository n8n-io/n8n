#!/bin/sh
if [ "$#" -gt 0 ]; then
  # Got started with arguments
  node "$@"
else
  # Got started without arguments
  n8n
fi
