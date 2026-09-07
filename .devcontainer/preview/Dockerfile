ARG NODE_VERSION=24

# Debian to match the agent image's toolchain. No Playwright, no agent CLIs and no
# Docker here: a preview only builds the repo and serves it.
FROM node:${NODE_VERSION}-bookworm

# tmux holds the backend between `preview refresh` runs. The rest is for triage.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tmux sudo less jq \
    && rm -rf /var/lib/apt/lists/*

# Shared with the agent config, so there is one copy of each shim. The build context
# is .devcontainer/, set in devcontainer.json, which is why these paths start with
# codespaces/. git and gh must survive Codespaces' token rotation; the stock helpers
# read a snapshot of $GITHUB_TOKEN and go stale in ssh and tmux shells.
COPY codespaces/codespaces-env.sh /usr/local/lib/codespaces-env.sh
COPY codespaces/gitcredential-refresh.sh /usr/local/bin/gitcredential-refresh.sh
COPY codespaces/gh-shim.sh /usr/local/bin/gh
RUN chmod +x /usr/local/bin/gitcredential-refresh.sh /usr/local/bin/gh

# Interactive shells for a human debugging the box.
RUN echo '. /usr/local/lib/codespaces-env.sh' >> /etc/bash.bashrc

RUN echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/node && chmod 0440 /etc/sudoers.d/node
RUN mkdir -p /workspaces && chown node:node /workspaces
RUN corepack enable

ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH

USER node
RUN mkdir -p $PNPM_HOME ~/.pnpm-store && pnpm config set store-dir ~/.pnpm-store --global
