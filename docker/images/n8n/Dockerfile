ARG NODE_VERSION=24.16.0
ARG N8N_VERSION=snapshot

# Stage 1 — sqlite3 + isolated-vm for musl, in a stage keyed only on the pinned
# versions + base digest, so it caches across builds (the old in-closure rebuild
# followed ./compiled, which changes every build, and never cached).
# isolated-vm is built from source: its musl prebuild segfaults under DHI Alpine.
FROM node:24.16.0-alpine3.22@sha256:191c9f0080fcbbc6547a85dc0ff7988072214a355aabdc1d2ec55a7dae5eea8a AS natives
RUN apk add --no-cache python3 make g++
WORKDIR /natives
RUN npm install --ignore-scripts --no-audit --no-fund isolated-vm@6.1.2 sqlite3@5.1.7
RUN GYP=/usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js && \
    cd /natives/node_modules/sqlite3 && node "$GYP" rebuild --release -j max && \
    cd /natives/node_modules/isolated-vm && node "$GYP" rebuild --release -j max

# Stage 2 — host-built n8n JS + the cached musl natives.
FROM node:24.16.0-alpine3.22@sha256:191c9f0080fcbbc6547a85dc0ff7988072214a355aabdc1d2ec55a7dae5eea8a AS builder
COPY ./compiled /usr/local/lib/node_modules/n8n
# Fail loudly on version drift, else the glibc binary in ./compiled survives.
RUN base=/usr/local/lib/node_modules/n8n/node_modules/.pnpm && \
    { test -d "$base/sqlite3@5.1.7" && test -d "$base/isolated-vm@6.1.2"; } || \
    { echo "ERROR: native version drift — bump sqlite3/isolated-vm in the natives stage"; exit 1; }
COPY --from=natives /natives/node_modules/sqlite3/build/Release/ \
     /usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3/build/Release/
COPY --from=natives /natives/node_modules/isolated-vm/build/Release/ \
     /usr/local/lib/node_modules/n8n/node_modules/.pnpm/isolated-vm@6.1.2/node_modules/isolated-vm/build/Release/
# Drop prebuilds so node-gyp-build loads the freshly built build/Release binary.
RUN rm -rf /usr/local/lib/node_modules/n8n/node_modules/.pnpm/isolated-vm@6.1.2/node_modules/isolated-vm/prebuilds

# Stage 3 — runtime.
# Pinned to multi-arch index digest (linux/amd64 + linux/arm64) for reproducible builds.
# n8nio/base is republished by a separate workflow (docker/images/n8n-base) on every
# base change, so a base rebuild does not reach this image until the digest is
# manually re-pinned here. Bump the digest together with the tag whenever the base
# image is intentionally updated.
# Digest pins to n8nio/base:24.16.0 (Node 24.16.0, Alpine 3.22).
FROM n8nio/base:24.16.0@sha256:a1aa4005e4faebd6da3ba51ec28180a3fb421243d921fa0efbba2d21395012f0

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
