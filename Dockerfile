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

# Pin to the latest stable n8n release. Update both here and in docker-compose.yml together.
# Latest as of 2026-03-06; check https://github.com/n8n-io/n8n/releases for newer versions.
ARG N8N_VERSION=2.10.4
# Node.js major version — N|Solid tracks the same LTS lines as Node.js
ARG NODE_MAJOR=22

# Enable pipefail so that pipe failures are caught and the build stops.
# /bin/sh on Debian (dash) supports -o pipefail; use bash explicitly if not.
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# ─── System dependencies ──────────────────────────────────────────────────────
# Versions pinned to current debian:bookworm-slim package versions for
# reproducible builds. Update with `apt-cache show <pkg>` when upgrading.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates=20230311+deb12u1 \
        curl=7.88.1-10+deb12u14 \
        gnupg=2.2.40-1.1+deb12u2 \
        openssl=3.0.18-1~deb12u2 \
        tini=0.19.0-1+b3 \
        graphicsmagick=1.4+really1.3.40-4+deb12u1 \
        git=1:2.39.5-0+deb12u3 \
        openssh-client=1:9.2p1-2+deb12u7 \
        tzdata=2025b-0+deb12u2 \
    && rm -rf /var/lib/apt/lists/*

# ─── Install N|Solid runtime from NodeSource ─────────────────────────────────
# N|Solid is a hardened, drop-in replacement for Node.js with built-in
# OpenTelemetry / observability support (no code changes required).
# Repository is added manually (GPG key + signed-by entry) to avoid the
# supply-chain risk of executing a remote shell script via curl | bash.
# nsolid is intentionally unpinned — it tracks the NodeSource LTS channel
# selected by NODE_MAJOR.
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /usr/share/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
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
# host.docker.internal resolves to the Docker Desktop host on macOS/Windows.
# Linux users: replace with the actual collector IP or use a sidecar service.
ENV NSOLID_OTLP_CONFIG='{"url":"http://host.docker.internal:4318/v1/traces","protocol":"http"}'
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
