#!/bin/sh
if [ -d /opt/custom-certificates ]; then
  echo "Trusting custom certificates from /opt/custom-certificates."
  export NODE_OPTIONS="--use-openssl-ca $NODE_OPTIONS"
  export SSL_CERT_DIR=/opt/custom-certificates
  c_rehash /opt/custom-certificates
fi

if [ -z "$HTTPS_PROXY" ] && [ -z "$HTTP_PROXY" ]; then
	echo "HTTPS_PROXY and HTTP_PROXY are unset or empty, no npm config proxy set"
else
	echo "proxy=$HTTP_PROXY" >> /home/node/.npmrc
	echo "https-proxy=$HTTPS_PROXY" >> /home/node/.npmrc
	[ -n "$NO_PROXY" ] && echo "noproxy=$NO_PROXY" >> /home/node/.npmrc
fi

if [ "$#" -gt 0 ]; then
  # Got started with arguments
  exec n8n "$@"
else
  # Got started without arguments
  exec n8n
fi
