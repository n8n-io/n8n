#!/bin/sh
if [ "$#" -gt 0 ]; then
  if [ "$1" = "worker" ]; then
    n8n worker
	else
  	# Got started with arguments
  	node "$@"
	fi
else
	# Run n8n without any additional arguments
	n8n
fi
