ARG NODE_VERSION=24.15.0
ARG N8N_VERSION=snapshot

# Builder stage exists because the runtime base image has no toolchain.
FROM node:${NODE_VERSION}-alpine3.23 AS builder
COPY ./compiled /usr/local/lib/node_modules/n8n
RUN apk add --no-cache python3 make g++ && \
    cd /usr/local/lib/node_modules/n8n && \
    npm rebuild sqlite3

FROM n8nio/base:${NODE_VERSION}

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV SHELL=/bin/sh

WORKDIR /home/node

# DHI's alpine3.23-dev base does not expose /usr/local/lib/node_modules as a
# writable install destination, so n8n itself is installed under /usr/lib.
COPY --from=builder /usr/local/lib/node_modules/n8n /usr/lib/node_modules/n8n
COPY docker/images/n8n/docker-entrypoint.sh /

RUN ln -s /usr/lib/node_modules/n8n/bin/n8n /usr/bin/n8n && \
    # /usr/local/bin/n8n is the long-standing public contract that downstream
    # stacks (n8n-cloud helm charts, AppArmor profiles, user overrides) exec
    # by absolute path. The DHI base does not ship /usr/local/bin, so create
    # it before symlinking.
    mkdir -p /usr/local/bin && \
    ln -s /usr/bin/n8n /usr/local/bin/n8n && \
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
