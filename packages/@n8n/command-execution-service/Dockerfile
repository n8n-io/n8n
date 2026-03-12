FROM node:22-bookworm-slim

# ── System packages ──
RUN apt-get update && \
	apt-get install -y --no-install-recommends \
		# Existing tools
		bubblewrap ripgrep tini git \
		# Data processing
		jq sqlite3 \
		# Document conversion
		pandoc \
		# Media
		ffmpeg \
		# Archives & compression
		zip unzip gzip bzip2 tar \
		# Build tools
		make patch \
		# Utilities
		fzf curl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# ── Node.js tooling ──
RUN npm install -g corepack@0.33 && corepack enable

# ── Global CLI tools (AI coding assistants) ──
RUN npm install -g @anthropic-ai/claude-code opencode-ai

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches/ patches/
COPY scripts/ scripts/
COPY packages/@n8n/command-execution-service/ packages/@n8n/command-execution-service/

ENV DOCKER_BUILD=true
RUN pnpm install --frozen-lockfile && \
	pnpm --filter=@n8n/command-execution-service build

ENV NODE_ENV=production
EXPOSE 5682

ENTRYPOINT ["tini", "--"]
CMD ["node", "packages/@n8n/command-execution-service/dist/main.js"]
