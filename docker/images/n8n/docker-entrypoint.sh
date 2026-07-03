#!/bin/sh
if [ "$N8N_ENABLE_JEMALLOC" = "true" ]; then
  if [ -f /usr/lib/libjemalloc.so.2 ]; then
    export LD_PRELOAD="/usr/lib/libjemalloc.so.2${LD_PRELOAD:+:$LD_PRELOAD}"
    echo "jemalloc enabled via LD_PRELOAD=$LD_PRELOAD"
  else
    echo "N8N_ENABLE_JEMALLOC=true but /usr/lib/libjemalloc.so.2 not found; continuing with default allocator" >&2
  fi
fi

if [ -d /opt/custom-certificates ]; then
  echo "Trusting custom certificates from /opt/custom-certificates."
  export NODE_OPTIONS="--use-openssl-ca $NODE_OPTIONS"
  export SSL_CERT_DIR=/opt/custom-certificates
  c_rehash /opt/custom-certificates
fi

if [ "$#" -gt 0 ]; then
  # Got started with arguments
  exec n8n "$@"
else
  # Got started without arguments
  exec n8n
fi
