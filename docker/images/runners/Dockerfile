ARG PYTHON_IMAGE=python:3.13-slim
ARG NODE_VERSION=22
ARG LAUNCHER_VERSION=1.3.0
ARG TARGETPLATFORM

# ==============================================================================
# STAGE 2: JavaScript runner (@n8n/task-runner) artifact from CI
# ==============================================================================
FROM alpine:3.22.0 AS app-artifact-processor
COPY ./dist/task-runner-javascript /app/task-runner-javascript

# ==============================================================================
# STAGE 2: Python runner build (@n8n/task-runner-python) with uv
# Produces a relocatable venv tied to PYTHON_IMAGE
# ==============================================================================
FROM ${PYTHON_IMAGE} AS python-runner-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates build-essential pkg-config git \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/0.8.14/install.sh | sh
RUN ln -s /root/.local/bin/uv /usr/local/bin/uv

WORKDIR /app/task-runner-python

COPY packages/@n8n/task-runner-python/pyproject.toml \
     packages/@n8n/task-runner-python/uv.lock** \
     packages/@n8n/task-runner-python/.python-version** \
     ./

RUN uv venv
RUN uv sync \
			--frozen \
			--no-editable \
			--no-install-project

COPY packages/@n8n/task-runner-python/ ./
RUN uv sync \
      --frozen \
      --no-editable

# ==============================================================================
# STAGE 2: Task Runner Launcher download
# ==============================================================================
FROM alpine:3.22.0 AS launcher-downloader
ARG TARGETPLATFORM
ARG LAUNCHER_VERSION=1.3.0

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
# STAGE 3: Runtime
# ==============================================================================
FROM ${PYTHON_IMAGE} AS runtime
ARG NODE_VERSION=22
ARG N8N_RELEASE_TYPE=dev
ARG LAUNCHER_VERSION=1.3.0

ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV SHELL=/bin/sh

RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl gnupg ca-certificates tini \
	&& mkdir -p /etc/apt/keyrings \
	&& curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
		| gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
	&& echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main" \
		> /etc/apt/sources.list.d/nodesource.list \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends nodejs \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*.deb

RUN useradd -m -u 1000 runner
WORKDIR /home/runner

COPY --from=app-artifact-processor /app/task-runner-javascript /opt/runners/task-runner-javascript
COPY --from=python-runner-builder /app/task-runner-python /opt/runners/task-runner-python
COPY --from=launcher-downloader /launcher-bin/* /usr/local/bin/

COPY docker/images/runners/n8n-task-runners.json /etc/n8n-task-runners.json

RUN chown -R runner:runner /opt/runners /home/runner
USER runner

EXPOSE 5680/tcp
ENTRYPOINT ["tini", "--", "/usr/local/bin/task-runner-launcher"]
CMD ["javascript", "python"]

LABEL org.opencontainers.image.title="n8n Task runners" \
      org.opencontainers.image.description="Sidecar image providing n8n task runners for JavaScript and Python code execution" \
      org.opencontainers.image.source="https://github.com/n8n-io/n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version="${LAUNCHER_VERSION}"
