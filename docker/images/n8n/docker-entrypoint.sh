#!/bin/sh

if [ "$#" -gt 0 ]; then
  # Got started with arguments
  exec node "$@"
else
  # Got started without arguments
  exec node n8n
fi
