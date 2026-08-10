ARG NODE_VERSION=24

# Debian, not Alpine: Playwright browsers and the agent CLIs need glibc
FROM node:${NODE_VERSION}-bookworm

ARG PLAYWRIGHT_VERSION=1.60.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    tmux sudo less jq ripgrep postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Chromium system libs baked into the image; browser binaries install per-user in onCreate
RUN npx -y playwright@${PLAYWRIGHT_VERSION} install-deps chromium

# Agent harnesses. Self-update is off: the image is the update mechanism
ENV DISABLE_AUTOUPDATER=1
RUN npm install -g @anthropic-ai/claude-code opencode-ai

COPY codespaces-secrets.sh /etc/profile.d/codespaces-secrets.sh

RUN echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/node && chmod 0440 /etc/sudoers.d/node
RUN mkdir -p /workspaces && chown node:node /workspaces
RUN corepack enable

ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH

USER node
RUN mkdir -p $PNPM_HOME ~/.pnpm-store && pnpm config set store-dir ~/.pnpm-store --global
