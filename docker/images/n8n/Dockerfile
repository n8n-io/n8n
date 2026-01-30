ARG NODE_VERSION=22.22.0
ARG N8N_VERSION=snapshot

FROM n8nio/base:${NODE_VERSION}

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV NODE_ICU_DATA=/usr/local/lib/node_modules/full-icu
ENV SHELL=/bin/sh

WORKDIR /home/node

COPY ./compiled /usr/local/lib/node_modules/n8n
COPY docker/images/n8n/docker-entrypoint.sh /

RUN cd /usr/local/lib/node_modules/n8n && \
    npm rebuild sqlite3 && \
    LANCEDB_PNPM_DIR=$(find node_modules/.pnpm -type d -name "@lancedb+lancedb@0.23.0*" | head -1) && \
    LANCEDB_PNPM_NAME=$(basename "$LANCEDB_PNPM_DIR") && \
    LANCEDB_DIR="$LANCEDB_PNPM_DIR/node_modules/@lancedb" && \
    # Download with integrity verification to prevent supply chain attacks
    wget -O /tmp/lancedb-x64.tgz https://registry.npmjs.org/@lancedb/lancedb-linux-x64-musl/-/lancedb-linux-x64-musl-0.23.0.tgz && \
    echo "146c841c469c8c758d7070757a87e1c54d533a8ccdbef45f9800c6baa6ee31db  /tmp/lancedb-x64.tgz" | sha256sum -c - && \
    tar -xzf /tmp/lancedb-x64.tgz -C /tmp && \
    mv /tmp/package "$LANCEDB_DIR/lancedb-linux-x64-musl" && \
    rm /tmp/lancedb-x64.tgz && \
    wget -O /tmp/lancedb-arm64.tgz https://registry.npmjs.org/@lancedb/lancedb-linux-arm64-musl/-/lancedb-linux-arm64-musl-0.23.0.tgz && \
    echo "7f591979b3f5dda4e4babe60ae44bede11e103061e9a333738e4374f2e6284b4  /tmp/lancedb-arm64.tgz" | sha256sum -c - && \
    tar -xzf /tmp/lancedb-arm64.tgz -C /tmp && \
    mv /tmp/package "$LANCEDB_DIR/lancedb-linux-arm64-musl" && \
    rm /tmp/lancedb-arm64.tgz && \
    rm -f node_modules/@lancedb/lancedb && \
    ln -sf "../.pnpm/$LANCEDB_PNPM_NAME/node_modules/@lancedb/lancedb" node_modules/@lancedb/lancedb && \
    ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n && \
    mkdir -p /home/node/.n8n && \
    chown -R node:node /home/node && \
    rm -rf /root/.npm /tmp/*

EXPOSE 5678/tcp
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool" \
      org.opencontainers.image.source="https://github.com/n8n-io/n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version=${N8N_VERSION}
