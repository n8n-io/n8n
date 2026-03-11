FROM node:22-bookworm-slim

RUN apt-get update && \
	apt-get install -y --no-install-recommends bubblewrap ripgrep tini git && \
	rm -rf /var/lib/apt/lists/*

RUN npm install -g corepack@0.33 && corepack enable

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
