# n8n on N|Solid Runtime
# ──────────────────────────────────────────────────────────────────────────────
# Runs n8n workflow automation using the N|Solid enhanced Node.js runtime,
# which provides built-in OpenTelemetry observability with zero code changes.
#
# Optimised for linux/arm64 (Apple M1/M2 MacBook Pro via Docker Desktop).
#
# Quick start:
#   docker build --platform linux/arm64 -t n8n-nsolid .
#   docker run -it --rm -p 5678:5678 -v n8n_data:/home/node/.n8n n8n-nsolid
#
# Then open http://localhost:5678 — you will be prompted to log in.
# ──────────────────────────────────────────────────────────────────────────────

FROM debian:bookworm-slim

ARG N8N_VERSION=latest
# Node.js major version — N|Solid tracks the same LTS lines as Node.js
ARG NODE_MAJOR=22

# ─── System dependencies ──────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        tini \
        graphicsmagick \
        git \
        openssh-client \
        tzdata \
    && rm -rf /var/lib/apt/lists/*

# ─── Install N|Solid runtime from NodeSource ─────────────────────────────────
# N|Solid is a hardened, drop-in replacement for Node.js with built-in
# OpenTelemetry / observability support (no code changes required).
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - \
    && apt-get install -y --no-install-recommends nsolid \
    && rm -rf /var/lib/apt/lists/*

# ─── Make N|Solid the default Node.js runtime ────────────────────────────────
# npm wrappers call `node`; pointing `node` at `nsolid` ensures every child
# process (including n8n's workers) also runs on the N|Solid runtime.
# NodeSource's nsolid package installs the binary at /usr/bin/nsolid; we
# create a stable `node` symlink at the same location so PATH lookups work.
RUN ln -sf /usr/bin/nsolid /usr/bin/node

# ─── Install n8n ─────────────────────────────────────────────────────────────
RUN npm install -g n8n@${N8N_VERSION} --omit=dev \
    && rm -rf /root/.npm /tmp/*

# ─── Prepare runtime user and data directory ─────────────────────────────────
RUN useradd --uid 1000 --create-home --shell /bin/sh node 2>/dev/null || true \
    && mkdir -p /home/node/.n8n \
    && chown -R node:node /home/node

# ─── N|Solid telemetry environment variables ─────────────────────────────────
# These are read by the N|Solid runtime at startup — no code changes needed.
#
# Application name shown in the N|Solid UI (http://localhost:3002)
ENV NSOLID_APPNAME="n8n"
# Comma-separated tags for filtering in the N|Solid dashboard
ENV NSOLID_TAGS="production,n8n,workflow-automation"
# Enable distributed tracing via OpenTelemetry
ENV NSOLID_TRACING_ENABLED=1
# OTLP exporter type ("otlp" exports to an OpenTelemetry Collector)
ENV NSOLID_OTLP=otlp
# OTLP endpoint — override at runtime with:
#   docker run -e NSOLID_OTLP_CONFIG='{"url":"http://<host>:4318/v1/traces","protocol":"http"}' ...
ENV NSOLID_OTLP_CONFIG='{"url":"http://localhost:4318/v1/traces","protocol":"http"}'
# ─────────────────────────────────────────────────────────────────────────────

# ─── n8n application settings ────────────────────────────────────────────────
ENV NODE_ENV=production
ENV SHELL=/bin/sh
# n8n stores workflow data, credentials, and settings here
VOLUME ["/home/node/.n8n"]

WORKDIR /home/node
EXPOSE 5678/tcp
USER node

COPY docker/images/n8n/docker-entrypoint.sh /docker-entrypoint.sh

# Ensure the entrypoint is executable (file may lose its permissions on COPY)
USER root
RUN chmod +x /docker-entrypoint.sh
USER node

ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
