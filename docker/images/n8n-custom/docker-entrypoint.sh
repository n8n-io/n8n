#!/bin/sh

if [ -d /root/.n8n ] ; then
  chmod o+rx /root
  chown -R node /root/.n8n
  ln -s /root/.n8n /home/node/
fi

chown -R node /home/node

if [ "$#" -gt 0 ]; then
  # Got started with arguments
  COMMAND=$1;

  if [[ "$COMMAND" == "n8n" ]]; then
    shift
    exec su-exec node ./packages/cli/bin/n8n "$@"
  else
    exec su-exec node "$@"
  fi

else
# Got started without arguments
exec su-exec node ./packages/cli/bin/n8n
fi
