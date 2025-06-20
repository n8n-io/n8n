ARG NODE_VERSION=22
ARG N8N_VERSION=snapshot
ARG LAUNCHER_VERSION=1.1.3
ARG TARGETPLATFORM


# ==============================================================================
# STAGE 1: System Dependencies & Base Setup
# Provides the runtime environment base.
# ==============================================================================
FROM node:${NODE_VERSION}-alpine AS system-deps

# Install system dependencies
RUN apk add --no-cache --virtual .build-deps-fonts \
        msttcorefonts-installer \
        fontconfig \
    && apk add --no-cache \
        git \
        openssh \
        graphicsmagick \
        tini \
        tzdata \
        ca-certificates \
        libc6-compat \
        wget \
    && update-ms-fonts \
    && fc-cache -f \
    && apk del .build-deps-fonts \
    && find /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \; \
    && rm -rf /var/cache/apk/* /tmp/*

# Setup Node.js environment (global npm update)
COPY .npmrc /usr/local/etc/npmrc
RUN npm install -g \
        corepack@0.31 \
        full-icu@1.5.0 \
    && corepack enable pnpm \
    && rm -rf /root/.npm /root/.cache

# ==============================================================================
# STAGE 2: Application Artifact Processor
# A clean intermediate stage to hold pre-built application artifacts from the build context.
# ==============================================================================
FROM system-deps AS app-artifact-processor

COPY ./compiled /app/

# ==============================================================================
# STAGE 3: Task Runner Launcher (Multi-platform)
# This stage specifically prepares the launcher.

# ==============================================================================
FROM system-deps AS launcher-downloader
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
# STAGE 4: Final Runtime Image
# Assembles the final image.
# ==============================================================================
FROM system-deps AS runtime

ARG N8N_VERSION
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV NODE_ICU_DATA=/usr/local/lib/node_modules/full-icu
ENV SHELL=/bin/sh

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool" \
      org.opencontainers.image.source="https://github.com/n8n-io/n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version=${N8N_VERSION}

WORKDIR /home/node

COPY --from=app-artifact-processor /app /usr/local/lib/node_modules/n8n
COPY --from=launcher-downloader /launcher-bin/* /usr/local/bin/
COPY docker/images/n8n/docker-entrypoint.sh /
COPY docker/images/n8n/n8n-task-runners.json /etc/n8n-task-runners.json

RUN cd /usr/local/lib/node_modules/n8n && \
    npm rebuild sqlite3 && \
    ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n && \
    mkdir -p /home/node/.n8n && \
    chown -R node:node /home/node && \
    rm -rf /var/cache/apk/* /lib/apk/db/* /etc/apk/

EXPOSE 5678/tcp
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]