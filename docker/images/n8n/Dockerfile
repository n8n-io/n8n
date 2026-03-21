ARG NODE_VERSION=24.13.1
ARG N8N_VERSION=snapshot

# Rebuild native addons for the container platform. The base image has no
# package manager or build tools, so we compile in a throwaway builder stage.
FROM node:${NODE_VERSION}-alpine AS builder
COPY ./compiled /usr/local/lib/node_modules/n8n
RUN apk add --no-cache python3 make g++ && \
    cd /usr/local/lib/node_modules/n8n && \
    npm rebuild sqlite3 isolated-vm

FROM n8nio/base:${NODE_VERSION}

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV SHELL=/bin/sh

WORKDIR /home/node

COPY --from=builder /usr/local/lib/node_modules/n8n /usr/local/lib/node_modules/n8n
COPY docker/images/n8n/docker-entrypoint.sh /

RUN ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n && \
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
