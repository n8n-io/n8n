# Sandbox for CLI workflow builders. The container sees only the run directory
# that is mounted at /out. It reaches n8n through host.docker.internal.
FROM node:26-slim

ARG CLAUDE_CODE_VERSION=latest
ARG CODEX_VERSION=latest

# Codex uses the system trust store. Claude Code uses the CA list in Node.
# tmux runs the interactive CLI screens so that they can be recorded and watched.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates tmux \
	&& rm -rf /var/lib/apt/lists/*

RUN npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" "@openai/codex@${CODEX_VERSION}" \
	&& npm cache clean --force

ENV DISABLE_AUTOUPDATER=1 \
	DISABLE_TELEMETRY=1 \
	DISABLE_ERROR_REPORTING=1 \
	CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
