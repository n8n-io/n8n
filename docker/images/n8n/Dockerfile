# check=skip=InvalidDefaultArgInFrom
ARG N8N_VERSION=snapshot

# docker/docker-bake.hcl sets these. Build with `pnpm build:docker` or
# `docker buildx bake`, not plain `docker build`.
ARG BUILDER_IMAGE
ARG RUNTIME_IMAGE
ARG ENABLE_POINTER_COMPRESSION=false

# Clean source of our compiled Node binaries before build tools are installed.
FROM ${BUILDER_IMAGE} AS node-source

# The runtime base has no compiler, so this stage supplies one.
FROM node-source AS toolchain
RUN apk add --no-cache python3 make g++
ENV NODE_GYP=/usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js

# Compile the native modules above `COPY ./compiled`. An application change
# then does not start a new compile.
FROM toolchain AS native-builder

# These paths are pnpm symlinks. Copying through them uses the resolved version.
COPY ./compiled/node_modules/.pnpm/isolated-vm@*/node_modules/isolated-vm /build/isolated-vm
WORKDIR /build/isolated-vm
# node-gyp-build reads /etc/alpine-release to find musl. DHI Alpine does not
# have that file, so the loader uses the glibc prebuild and crashes.
RUN rm -rf prebuilds && node "$NODE_GYP" rebuild --release -j max

# sqlite3 needs node-addon-api for the headers, and `tar` because a gyp action
# unpacks the sqlite source. pnpm gives each package its own directory, so the
# dependencies of `tar` must come too.
COPY ./compiled/node_modules/.pnpm/sqlite3@*/node_modules/node-addon-api /build/node_modules/node-addon-api
COPY ./compiled/node_modules/.pnpm/sqlite3@*/node_modules/tar /build/node_modules/tar
COPY ./compiled/node_modules/.pnpm/tar@*/node_modules/@isaacs/fs-minipass /build/node_modules/@isaacs/fs-minipass
COPY ./compiled/node_modules/.pnpm/tar@*/node_modules/chownr /build/node_modules/chownr
COPY ./compiled/node_modules/.pnpm/tar@*/node_modules/minipass /build/node_modules/minipass
COPY ./compiled/node_modules/.pnpm/tar@*/node_modules/minizlib /build/node_modules/minizlib
COPY ./compiled/node_modules/.pnpm/tar@*/node_modules/yallist /build/node_modules/yallist
COPY ./compiled/node_modules/.pnpm/sqlite3@*/node_modules/sqlite3 /build/node_modules/sqlite3
WORKDIR /build/node_modules/sqlite3
RUN node "$NODE_GYP" rebuild --release

# Confluent has no prebuild for the Node version that CI installs, so
# `./compiled` has none. Compile it here against the base image librdkafka.
# See https://github.com/confluentinc/confluent-kafka-javascript/issues/397
RUN apk add --no-cache librdkafka-dev
COPY ./compiled/node_modules/.pnpm/@confluentinc+kafka-javascript@*/node_modules/nan /build/node_modules/nan
COPY ./compiled/node_modules/.pnpm/@confluentinc+kafka-javascript@*/node_modules/@confluentinc/kafka-javascript /build/node_modules/@confluentinc/kafka-javascript
WORKDIR /build/node_modules/@confluentinc/kafka-javascript
RUN BUILD_LIBRDKAFKA=0 node "$NODE_GYP" rebuild --release

# A separate workflow builds the base image. A new base reaches this image only
# when you change its pin in docker/docker-bake.hcl.
FROM ${RUNTIME_IMAGE}

# Replace the base image's stock Node with our compiled Node from BUILDER_IMAGE.
# Keeping this above release metadata ARGs/ENV and `COPY ./compiled` decouples
# OS base refreshes from Node source compiles while keeping release and app-only
# builds cached on these layers. Specific V8 patches are verified by
# check-v8-patches.js when BUILDER_IMAGE is built; verify the binary path,
# runtime ABI, `-n8n.N` V8 suffix, and pointer-compression flag here so a future
# inputs PR updating check-v8-patches.js does not fail against the pinned image.
RUN rm -f /usr/bin/node /usr/bin/nodejs /usr/bin/npm /usr/bin/npx /usr/local/bin/node
COPY --from=node-source /usr/local/bin /usr/local/bin
COPY --from=node-source /usr/local/lib /usr/local/lib
ARG ENABLE_POINTER_COMPRESSION
RUN node --version \
    && node -e 'const want = process.env.ENABLE_POINTER_COMPRESSION === "true", got = Boolean(process.config.variables.v8_enable_pointer_compression); if (process.execPath !== "/usr/local/bin/node") throw new Error("expected /usr/local/bin/node, got " + process.execPath); if (!/-n8n\.\d+$/.test(process.versions.v8)) throw new Error("V8 " + process.versions.v8 + " has no n8n patch suffix"); if (want !== got) throw new Error("pointer compression is " + (got ? "on" : "off") + ", expected " + (want ? "on" : "off"));' \
    && ln -sf /usr/local/bin/node /usr/bin/node

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ARG IMAGE_DESCRIPTION="Workflow Automation Tool"
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV SHELL=/bin/sh
# Restrict GraphicsMagick to its commonly used coder set.
ENV MAGICK_CODER_STABILITY=PRIMARY

WORKDIR /home/node

COPY --link ./compiled /usr/local/lib/node_modules/n8n
COPY --link docker/images/n8n/docker-entrypoint.sh /

# Do not use --link here. These destinations are pnpm symlinks. A --link copy
# resolves the destination against an empty root. It replaces the symlink with
# a directory, and the module does not load. The build still succeeds.
COPY --from=native-builder /build/node_modules/sqlite3/build/Release/node_sqlite3.node \
     /usr/local/lib/node_modules/n8n/node_modules/sqlite3/build/Release/node_sqlite3.node
COPY --from=native-builder /build/isolated-vm/build/Release/isolated_vm.node \
     /usr/local/lib/node_modules/n8n/node_modules/isolated-vm/build/Release/isolated_vm.node
# kafka-javascript has no top-level symlink, and its pnpm directory name holds
# a patch hash. The shell must expand this destination.
COPY --from=native-builder /build/node_modules/@confluentinc/kafka-javascript/build/Release/confluent-kafka-javascript.node /tmp/

# Symlink n8n into /usr/local/bin where cloud launch configs expect it.
RUN set -e; \
    N8N=/usr/local/lib/node_modules/n8n; \
    for coder in msl mvg pcd svg url; do \
        rm -f \
            /usr/lib/GraphicsMagick-*/modules-*/coders/$coder.la \
            /usr/lib/GraphicsMagick-*/modules-*/coders/$coder.so; \
    done; \
    ! find /usr/lib/GraphicsMagick-* -path '*/coders/*' \
        \( -name 'msl.*' -o -name 'mvg.*' -o -name 'pcd.*' -o -name 'svg.*' -o -name 'url.*' \) \
        -print -quit | grep -q .; \
    kafka=$(echo "$N8N"/node_modules/.pnpm/@confluentinc+kafka-javascript@*/node_modules/@confluentinc/kafka-javascript); \
    install -D /tmp/confluent-kafka-javascript.node "$kafka/build/Release/confluent-kafka-javascript.node"; \
    rm -rf "$N8N"/node_modules/.pnpm/isolated-vm@*/node_modules/isolated-vm/prebuilds; \
    mkdir -p /usr/local/bin; \
    ln -s "$N8N/bin/n8n" /usr/local/bin/n8n; \
    mkdir -p /home/node/.n8n; \
    chown -R node:node /home/node; \
    rm -rf /root/.npm /tmp/*

EXPOSE 5678/tcp
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="${IMAGE_DESCRIPTION}" \
      org.opencontainers.image.source="https://github.com/n8n-io/n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version=${N8N_VERSION}
