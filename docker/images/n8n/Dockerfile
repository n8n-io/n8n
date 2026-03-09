ARG NODE_VERSION=24.13.1
ARG N8N_VERSION=snapshot

FROM n8nio/base:${NODE_VERSION}

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV NODE_PATH=/opt/nodejs/node-v${NODE_VERSION}/lib/node_modules:/usr/lib/node_modules
ENV SHELL=/bin/sh

WORKDIR /home/node

COPY ./compiled /usr/lib/node_modules/n8n
COPY docker/images/n8n/docker-entrypoint.sh /
COPY docker/images/n8n/tracing.js /tracing.js
COPY docker/images/n8n/package.json /package.json

RUN cd / && \
    apk add --no-cache sqlite && \
    npm install --omit=dev --legacy-peer-deps && \
    cd /usr/lib/node_modules/n8n && \
    npm rebuild sqlite3 isolated-vm && \
    ln -s /usr/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n && \
    mkdir -p /home/node/.n8n && \
    chown -R node:node /home/node && \
    rm -f /package.json /package-lock.json && \
    rm -rf /root/.npm /tmp/*

EXPOSE 5678/tcp
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool" \
      org.opencontainers.image.source="https://github.com/n8n-io/n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version=${N8N_VERSION}
