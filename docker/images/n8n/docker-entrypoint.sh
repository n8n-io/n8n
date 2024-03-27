#!/bin/sh
if [ -f /opt/custom-certificate.crt ]; then
  echo "Custom certificates found."
  export NODE_OPTIONS=--use-openssl-ca $NODE_OPTIONS
  export SSL_CERT_FILE=/opt/custom-certificate.crt
fi

if [ "$#" -gt 0 ]; then
  # Got started with arguments
  exec n8n "$@"
else
  # Got started without arguments
  exec n8n
fi
