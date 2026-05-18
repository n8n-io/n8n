ARG NODE_VERSION=24.15.0
ARG N8N_VERSION=snapshot

# Pinned revision of n8nio/base. The base image is rebuilt from master's
# n8n-base/Dockerfile and republished under the floating `n8nio/base:<NODE_VERSION>`
# tag, so any upstream-layout shift (alpine/DHI/Node bumps) on master is
# otherwise forced through to this release lane on the next build.
# Bump deliberately; do not let a floating tag move us silently.
# Advance via: chore: Advance n8nio/base pin on release-candidate/2.20.x
ARG BASE_IMAGE_REVISION=82575001e322fb0286069812b735a7a640d5bc48

# Rebuild native addons for the container platform. The base image has no
# package manager or build tools, so we compile in a throwaway builder stage.
FROM node:${NODE_VERSION}-alpine3.23 AS builder
COPY ./compiled /usr/local/lib/node_modules/n8n
RUN apk add --no-cache python3 make g++ && \
    cd /usr/local/lib/node_modules/n8n && \
    npm rebuild sqlite3 isolated-vm

FROM n8nio/base:${NODE_VERSION}-${BASE_IMAGE_REVISION}

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV SHELL=/bin/sh

WORKDIR /home/node

COPY --from=builder /usr/local/lib/node_modules/n8n /usr/lib/node_modules/n8n
COPY docker/images/n8n/docker-entrypoint.sh /

RUN ln -s /usr/lib/node_modules/n8n/bin/n8n /usr/bin/n8n && \
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
