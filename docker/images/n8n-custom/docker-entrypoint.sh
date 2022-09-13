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
    (cd packages/cli; exec node ./bin/n8n "$@")
  else
    exec node "$@"
  fi

else
# Got started without arguments
cd packages/cli; exec node ./bin/n8n
fi
