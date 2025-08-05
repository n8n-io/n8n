# syntax=docker/dockerfile:1.5

###############################
# 1) Builder – compile n8n   #
###############################
ARG NODE_VERSION=20
ARG TARGETPLATFORM

FROM --platform=$TARGETPLATFORM n8nio/base:${NODE_VERSION} AS builder

#–––– Context & Caching ––––#
WORKDIR /src

# Install pnpm via Corepack (Node 20 ships Corepack but disabled)
RUN corepack enable \
    && corepack prepare pnpm@10.12.1 --activate

COPY . /src

# Use BuildKit cache mounts for pnpm store & metadata
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm/metadata \
    DOCKER_BUILD=true pnpm install --frozen-lockfile \
    && pnpm build

#–––– Slim down the tree ––––#
RUN jq 'del(.pnpm.patchedDependencies)' package.json > package.json.tmp && mv package.json.tmp package.json \
    # Run the trim script only if it exists (repo forks may omit .github folder)
    && if [ -f .github/scripts/trim-fe-packageJson.js ]; then \
         node .github/scripts/trim-fe-packageJson.js; \
       else \
         echo "trim-fe-packageJson.js not found – skipping"; \
       fi \
    # Remove TS, sourcemaps, Vue SFCs, etc. to shrink final image size
    && find . -type f \( -name "*.ts" -o -name "*.js.map" -o -name "*.vue" -o -name "tsconfig.json" -o -name "*.tsbuildinfo" \) -delete

# Deploy only the n8n package (+ its prod deps) into /compiled
RUN mkdir /compiled \
    && NODE_ENV=production DOCKER_BUILD=true pnpm --filter=n8n --prod --no-optional --legacy deploy /compiled

###############################
# 2) Runtime – minimal image  #
###############################
FROM --platform=$TARGETPLATFORM n8nio/base:${NODE_VERSION}

ENV NODE_ENV=production \
    N8N_PORT=5678 \
    GENERIC_TIMEZONE="UTC" \
    N8N_RELEASE_TYPE=dev \
    N8N_DISABLE_TELEMETRY=true

WORKDIR /home/node

# Copy the compiled artefacts
COPY --from=builder /compiled /usr/local/lib/node_modules/n8n

# Bundle entrypoint & task‑runner config from repo (paths may vary in forks)
COPY docker/images/n8n/docker-entrypoint.sh /docker-entrypoint.sh
COPY docker/images/n8n/n8n-task-runners.json /etc/n8n-task-runners.json

#–––– Task‑runner launcher ––––#
ARG LAUNCHER_VERSION=1.1.2
RUN set -eux; \
    if [ "$TARGETPLATFORM" = "linux/amd64" ]; then ARCH_NAME="amd64"; \
    elif [ "$TARGETPLATFORM" = "linux/arm64" ]; then ARCH_NAME="arm64"; fi; \
    mkdir /launcher-temp && cd /launcher-temp && \
    wget -q https://github.com/n8n-io/task-runner-launcher/releases/download/${LAUNCHER_VERSION}/task-runner-launcher-${LAUNCHER_VERSION}-linux-${ARCH_NAME}.tar.gz && \
    wget -q https://github.com/n8n-io/task-runner-launcher/releases/download/${LAUNCHER_VERSION}/task-runner-launcher-${LAUNCHER_VERSION}-linux-${ARCH_NAME}.tar.gz.sha256 && \
    echo "$(cat task-runner-launcher-${LAUNCHER_VERSION}-linux-${ARCH_NAME}.tar.gz.sha256)  task-runner-launcher-${LAUNCHER_VERSION}-linux-${ARCH_NAME}.tar.gz" > checksum.sha256 && \
    sha256sum -c checksum.sha256 && \
    tar xvf task-runner-launcher-${LAUNCHER_VERSION}-linux-${ARCH_NAME}.tar.gz --directory=/usr/local/bin && \
    cd - && rm -rf /launcher-temp

# Rebuild native bindings (sqlite3) for the final image libc
RUN cd /usr/local/lib/node_modules/n8n && npm rebuild sqlite3 && cd -

# Symlink CLI & prepare data dir
RUN ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n \
    && mkdir -p /home/node/.n8n \
    && chown node:node /home/node/.n8n

EXPOSE 5678
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
