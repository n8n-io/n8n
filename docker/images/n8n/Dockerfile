ARG NODE_VERSION=24.22.1
ARG N8N_VERSION=snapshot
ARG LAUNCHER_VERSION=1.4.3
ARG TARGETPLATFORM

ARG BUILDER_IMAGE=node:24.22.1-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
ARG RUNTIME_IMAGE=n8nio/base:24.22.1@sha256:711f03f1f2cfaa3bc0bc65bdf9dbd0cd929d8e4620fcdb5729b53b51d85578f2

# ==============================================================================
# STAGE 1: System Dependencies & Base Setup
# ==============================================================================
FROM ${RUNTIME_IMAGE} AS system-deps

# ==============================================================================
# STAGE 2: Application Artifact Processor
# ==============================================================================
FROM alpine:3.22.2 AS app-artifact-processor

COPY ./compiled /app/

# ==============================================================================
# STAGE 3: Task Runner Launcher
# ==============================================================================
FROM alpine:3.22.2 AS launcher-downloader
ARG TARGETPLATFORM
ARG LAUNCHER_VERSION

RUN set -e; \
    case "$TARGETPLATFORM" in \
        "linux/amd64") ARCH_NAME="amd64" ;; \
        "linux/arm64") ARCH_NAME="arm64" ;; \
        *) echo "Unsupported platform: $TARGETPLATFORM" && exit 1 ;; \
    esac; \
    mkdir /launcher-temp && cd /launcher-temp; \
    wget -q "https://github.com/n8n-io/task-runner-launcher/releases/download/${LAUNCHER_VERSION}/task-runner-launcher-${LAUNCHER_VERSION}-linux-${ARCH_NAME}.tar.gz"; \
    wget -q "https://github.com/n8n-io/task-runner-launcher/releases/download/${LAUNCHER_VERSION}/task-runner-launcher-${LAUNCHER_VERSION}-linux-${ARCH_NAME}.tar.gz.sha256"; \
    echo "$(cat task-runner-launcher-${LAUNCHER_VERSION}-linux-${ARCH_NAME}.tar.gz.sha256) task-runner-launcher-${LAUNCHER_VERSION}-linux-${ARCH_NAME}.tar.gz" > checksum.sha256; \
    sha256sum -c checksum.sha256; \
    mkdir -p /launcher-bin; \
    tar xzf task-runner-launcher-${LAUNCHER_VERSION}-linux-${ARCH_NAME}.tar.gz -C /launcher-bin; \
    cd / && rm -rf /launcher-temp

# ==============================================================================
# STAGE 4: Native Module Builder (isolated-vm musl rebuild)
# ==============================================================================
# Rebuild isolated-vm from source for musl libc. node-gyp-build's musl
# detection relies on /etc/alpine-release, which the hardened runtime base
# omits, so the bundled prebuilt loader picks the glibc binary and segfaults
# in musl pthread paths. Removing prebuilds and invoking node-gyp directly
# avoids npm rebuild's double-build behavior (built-in node-gyp + install-script
# node-gyp) which races on dep-file state. Build tooling stays in this throwaway
# stage so the runtime image ships no compilers.
FROM ${BUILDER_IMAGE} AS native-builder

COPY --from=app-artifact-processor /app /usr/local/lib/node_modules/n8n

RUN apk add --no-cache python3 make g++ openssl && \
    cd /usr/local/lib/node_modules/n8n/node_modules/isolated-vm && \
    rm -rf prebuilds && \
    npx --yes node-gyp rebuild --release -j max

# ==============================================================================
# STAGE 5: Final Runtime Image
# ==============================================================================
FROM system-deps AS runtime

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV SHELL=/bin/sh
# Restrict GraphicsMagick to its commonly used coder set.
ENV MAGICK_CODER_STABILITY=PRIMARY

WORKDIR /home/node

COPY --from=app-artifact-processor /app /usr/local/lib/node_modules/n8n
COPY --from=launcher-downloader /launcher-bin/* /usr/local/bin/
COPY --from=native-builder /usr/bin/openssl /usr/bin/openssl
# Overlay the musl-rebuilt isolated-vm binary (see native-builder stage).
COPY --from=native-builder /usr/local/lib/node_modules/n8n/node_modules/isolated-vm/build /usr/local/lib/node_modules/n8n/node_modules/isolated-vm/build
COPY docker/images/n8n/docker-entrypoint.sh /
COPY docker/images/n8n/n8n-task-runners.json /etc/n8n-task-runners.json

RUN cd /usr/local/lib/node_modules/n8n && \
		npm rebuild sqlite3 && \
		rm -rf node_modules/isolated-vm/prebuilds && \
		ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n && \
    mkdir -p /home/node/.n8n && \
    chown -R node:node /home/node

RUN cd /usr/local/lib/node_modules/n8n/node_modules/pdfjs-dist && npm install @napi-rs/canvas

# Patch all npm bundled tar copies to 7.5.7 for CVE fixes (CVE-2026-23745, CVE-2026-23950, CVE-2026-24842)
RUN set -e; \
    for coder in msl mvg pcd svg url; do \
        rm -f \
            /usr/lib/GraphicsMagick-*/modules-*/coders/$coder.la \
            /usr/lib/GraphicsMagick-*/modules-*/coders/$coder.so; \
    done; \
    ! find /usr/lib/GraphicsMagick-* -path '*/coders/*' \
        \( -name 'msl.*' -o -name 'mvg.*' -o -name 'pcd.*' -o -name 'svg.*' -o -name 'url.*' \) \
        -print -quit | grep -q .; \
    TAR_TGZ=$(mktemp); \
    wget -qO "$TAR_TGZ" https://registry.npmjs.org/tar/-/tar-7.5.7.tgz; \
    for dir in \
      /usr/local/lib/node_modules/npm/node_modules/tar \
      /usr/local/lib/node_modules/npm/node_modules/cacache/node_modules/tar \
      /usr/local/lib/node_modules/npm/node_modules/node-gyp/node_modules/tar; \
    do \
      [ -d "$dir" ] && rm -rf "$dir" && mkdir -p "$dir" && tar -xzf "$TAR_TGZ" --strip-components=1 -C "$dir"; \
    done; \
    rm -f "$TAR_TGZ"

EXPOSE 5678/tcp
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool" \
      org.opencontainers.image.source="https://github.com/n8n-io/n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version=${N8N_VERSION}
