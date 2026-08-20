ARG NODE_VERSION=26.5.1
ARG N8N_VERSION=snapshot

# The runtime base has no compiler, so this stage supplies one.
# The digest pins node:26.5.1-alpine3.24 for amd64 and arm64. Change the tag and the digest together.
FROM node:26.5.1-alpine3.24@sha256:233761595746769ebfdb6090f44fc7cdf818ae0ce62d2b37e0367723b9823e36 AS toolchain
RUN apk add --no-cache python3 make g++

# Build isolated-vm in a separate stage. The only cache input is the module source.
# Below `COPY ./compiled`, each application change starts a new compile.
FROM toolchain AS native-builder
# `node_modules/isolated-vm` is a pnpm symlink, so copy the target directory.
# The wildcard tracks the version in the catalog.
COPY ./compiled/node_modules/.pnpm/isolated-vm@*/node_modules/isolated-vm /build/isolated-vm
WORKDIR /build/isolated-vm
# node-gyp-build reads /etc/alpine-release to detect musl. DHI Alpine has no such file,
# so the loader takes the glibc prebuild and crashes. Build from source instead.
# Call node-gyp directly: `npm rebuild` starts two builds that conflict, and
# `npx node-gyp` downloads a different version at build time.
RUN rm -rf prebuilds && \
    node /usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild --release -j max

FROM toolchain AS builder
COPY ./compiled /usr/local/lib/node_modules/n8n
# Call node-gyp directly rather than `npm rebuild sqlite3`: sqlite3 is reachable through
# several symlinks in the pnpm tree, and npm runs one install script per link
# concurrently in the same store directory, where they collide on build/node_gyp_bins
# and on each other's make output. npm's bundled node-gyp also fixes the toolchain
# version to the pinned image digest instead of fetching it at build time.
RUN cd /usr/local/lib/node_modules/n8n/node_modules/sqlite3 && \
    node /usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild --release
# The workspace install cannot build this binding, because CI installs on a Node version
# Confluent ships no prebuild for, so `./compiled` arrives without one. Compile it here
# and link against the runtime base's librdkafka. See: https://github.com/confluentinc/confluent-kafka-javascript/issues/397
RUN apk add --no-cache librdkafka-dev && \
    cd /usr/local/lib/node_modules/n8n/node_modules/.pnpm/@confluentinc+kafka-javascript@*/node_modules/@confluentinc/kafka-javascript && \
    BUILD_LIBRDKAFKA=0 node /usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild --release
COPY --from=native-builder /build/isolated-vm/build/Release/isolated_vm.node \
     /usr/local/lib/node_modules/n8n/node_modules/isolated-vm/build/Release/isolated_vm.node
# node-gyp-build finds build/Release first. Delete the prebuilds to remove the glibc fallback.
RUN rm -rf /usr/local/lib/node_modules/n8n/node_modules/isolated-vm/prebuilds

# The digest pins n8nio/base:26.5.1 for amd64 and arm64. A separate workflow builds that
# image, so a new base reaches this image only when you change the digest here.
FROM n8nio/base:26.5.1@sha256:1b0bca5c94bbd04ad2120b9e9892a8bc717a1d88efa76fefe452c59bdc611d25

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV SHELL=/bin/sh

WORKDIR /home/node

COPY --from=builder /usr/local/lib/node_modules/n8n /usr/local/lib/node_modules/n8n
COPY docker/images/n8n/docker-entrypoint.sh /

# The base keeps node in /usr/bin and has no /usr/local/bin. Make that directory for the symlink.
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
