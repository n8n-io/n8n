ARG NODE_VERSION=24.18.0
ARG N8N_VERSION=snapshot

# Builder stage exists because the runtime base image has no toolchain.
# Pinned to multi-arch index digest (linux/amd64 + linux/arm64) for reproducible builds.
# Bump the digest together with the tag when updating the base image.
# Digest pins to node:24.18.0-alpine3.24 (Node 24.18.0, Alpine 3.24).
FROM node:24.18.0-alpine3.24@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS builder
COPY ./compiled /usr/local/lib/node_modules/n8n
RUN apk add --no-cache python3 make g++ && \
    cd /usr/local/lib/node_modules/n8n && \
    npm rebuild sqlite3 && \
    # Rebuild isolated-vm from source. node-gyp-build's musl detection relies
    # on /etc/alpine-release which DHI Alpine omits, so the bundled prebuilt
    # loader picks the glibc binary and segfaults in musl pthread paths.
    # Removing prebuilds and invoking node-gyp directly avoids npm rebuild's
    # double-build behavior (built-in node-gyp + install-script node-gyp)
    # which races on dep-file state.
    # Use npm's bundled node-gyp rather than `npx node-gyp` so the toolchain
    # version is fixed by the pinned image digest instead of being fetched
    # from the registry at build time.
    rm -rf node_modules/isolated-vm/prebuilds && \
    cd node_modules/isolated-vm && \
    node /usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild --release -j max

# Pinned to multi-arch index digest (linux/amd64 + linux/arm64) for reproducible builds.
# n8nio/base is republished by a separate workflow (docker/images/n8n-base) on every
# base change, so a base rebuild does not reach this image until the digest is
# manually re-pinned here. Bump the digest together with the tag whenever the base
# image is intentionally updated.
# Digest pins to n8nio/base:24.18.0 (Node 24.18.0, Alpine 3.24).
FROM n8nio/base:24.18.0@sha256:29d9c11f55f02442276512592b439ebb2a1d1043c1339ad5cea4e56862520d22

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV SHELL=/bin/sh

WORKDIR /home/node

COPY --from=builder /usr/local/lib/node_modules/n8n /usr/local/lib/node_modules/n8n
COPY docker/images/n8n/docker-entrypoint.sh /

# The Alpine 3.24 base has no /usr/local/bin (node lives in /usr/bin); create it for the symlink.
RUN mkdir -p /usr/local/bin && \
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
