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
    wget -qO- https://registry.npmjs.org/@lancedb/lancedb-linux-x64-musl/-/lancedb-linux-x64-musl-0.23.0.tgz | tar -xz -C /tmp && \
    mv /tmp/package "$LANCEDB_DIR/lancedb-linux-x64-musl" && \
    wget -qO- https://registry.npmjs.org/@lancedb/lancedb-linux-arm64-musl/-/lancedb-linux-arm64-musl-0.23.0.tgz | tar -xz -C /tmp && \
    mv /tmp/package "$LANCEDB_DIR/lancedb-linux-arm64-musl" && \
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
