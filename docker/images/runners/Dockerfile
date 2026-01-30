ARG NODE_VERSION=22.22.0
ARG PYTHON_VERSION=3.13

# ==============================================================================
# STAGE 1: JavaScript runner (@n8n/task-runner) artifact from CI
# ==============================================================================
FROM node:${NODE_VERSION}-alpine AS javascript-runner-builder
COPY ./dist/task-runner-javascript /app/task-runner-javascript

WORKDIR /app/task-runner-javascript

RUN corepack enable pnpm

# Remove `catalog` and `workspace` references from package.json to allow `pnpm add` in extended images
RUN node -e "const pkg = require('./package.json'); \
    Object.keys(pkg.dependencies || {}).forEach(k => { \
        const val = pkg.dependencies[k]; \
        if (val === 'catalog:' || val.startsWith('catalog:') || val.startsWith('workspace:')) \
            delete pkg.dependencies[k]; \
    }); \
    Object.keys(pkg.devDependencies || {}).forEach(k => { \
        const val = pkg.devDependencies[k]; \
        if (val === 'catalog:' || val.startsWith('catalog:') || val.startsWith('workspace:')) \
            delete pkg.devDependencies[k]; \
    }); \
    delete pkg.devDependencies; \
    require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));"

# Install moment (special case for backwards compatibility)
RUN rm -f node_modules/.modules.yaml && \
    pnpm add moment@2.30.1 --prod --no-lockfile

# ==============================================================================
# STAGE 2: Python runner build (@n8n/task-runner-python) with uv
# Produces a relocatable venv tied to the python version used
# ==============================================================================
FROM python:${PYTHON_VERSION}-alpine AS python-runner-builder
ARG TARGETPLATFORM
ARG UV_VERSION=0.8.14

RUN set -e; \
  case "$TARGETPLATFORM" in \
    "linux/amd64") UV_ARCH="x86_64-unknown-linux-musl" ;; \
    "linux/arm64") UV_ARCH="aarch64-unknown-linux-musl" ;; \
    *) echo "Unsupported platform: $TARGETPLATFORM" >&2; exit 1 ;; \
  esac; \
  mkdir -p /tmp/uv && cd /tmp/uv; \
  wget -q "https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-${UV_ARCH}.tar.gz"; \
  wget -q "https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-${UV_ARCH}.tar.gz.sha256"; \
  sha256sum -c "uv-${UV_ARCH}.tar.gz.sha256"; \
	tar -xzf "uv-${UV_ARCH}.tar.gz"; \
  install -m 0755 "uv-${UV_ARCH}/uv" /usr/local/bin/uv; \
  cd / && rm -rf /tmp/uv

WORKDIR /app/task-runner-python

COPY packages/@n8n/task-runner-python/pyproject.toml \
     packages/@n8n/task-runner-python/uv.lock** \
     packages/@n8n/task-runner-python/.python-version** \
     ./

RUN uv venv
RUN uv sync \
			--frozen \
			--no-editable \
			--no-install-project \
			--no-dev \
			--all-extras

COPY packages/@n8n/task-runner-python/ ./
RUN uv sync \
      --frozen \
			--no-dev \
			--all-extras \
      --no-editable

# ==============================================================================
# STAGE 3: Task Runner Launcher download
# ==============================================================================
FROM alpine:3.22.1 AS launcher-downloader
ARG TARGETPLATFORM
ARG LAUNCHER_VERSION=1.4.2

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
# STAGE 4: Node alpine base for JS task runner
# ==============================================================================
FROM node:${NODE_VERSION}-alpine AS node-alpine

# ==============================================================================
# STAGE 5: Runtime
# ==============================================================================
FROM python:${PYTHON_VERSION}-alpine AS runtime
ARG N8N_VERSION=snapshot
ARG N8N_RELEASE_TYPE=dev

ENV NODE_ENV=production \
    N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE} \
    SHELL=/bin/sh

# Bring `uv` over from python-runner-builder, to make the image easier to extend
COPY --from=python-runner-builder /usr/local/bin/uv /usr/local/bin/uv

# Bring node over from node-alpine
COPY --from=node-alpine /usr/local/bin/node /usr/local/bin/node

# libstdc++ is required by Node
# libc6-compat is required by task-runner-launcher
RUN apk add --no-cache ca-certificates tini libstdc++ libc6-compat && \
    apk del apk-tools

# Bring corepack and pnpm over, to make the image easier to extend
COPY --from=node-alpine /usr/local/lib/node_modules/corepack /usr/local/lib/node_modules/corepack
RUN ln -s ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack && \
		ln -s ../lib/node_modules/corepack/dist/pnpm.js /usr/local/bin/pnpm

RUN addgroup -g 1000 -S runner \
 && adduser  -u 1000 -S -G runner -h /home/runner -D runner

WORKDIR /home/runner

COPY --from=javascript-runner-builder --chown=root:root /app/task-runner-javascript /opt/runners/task-runner-javascript
COPY --from=python-runner-builder --chown=root:root /app/task-runner-python /opt/runners/task-runner-python
COPY --from=launcher-downloader /launcher-bin/* /usr/local/bin/
COPY --chown=root:root docker/images/runners/n8n-task-runners.json /etc/n8n-task-runners.json

USER runner

EXPOSE 5680/tcp
ENTRYPOINT ["tini", "--", "/usr/local/bin/task-runner-launcher"]
CMD ["javascript", "python"]

LABEL org.opencontainers.image.title="n8n task runners" \
      org.opencontainers.image.description="Sidecar image providing n8n task runners for JavaScript and Python code execution" \
      org.opencontainers.image.source="https://github.com/n8n-io/n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version="${N8N_VERSION}"
