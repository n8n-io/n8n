#!/bin/sh

if [ -d /root/.n8n ] ; then
  chmod o+rx /root
  chown -R node /root/.n8n
  ln -s /root/.n8n /home/node/
fi

# node user needs to be able to write in this folder to be able to customize static assets
mkdir -p /usr/local/lib/node_modules/n8n/dist/public
chown -R node /home/node /usr/local/lib/node_modules/n8n/dist/public

if [ "$#" -gt 0 ]; then
  # Got started with arguments
  exec su-exec node "$@"
else
  # Got started without arguments
  exec su-exec node n8n
fi
