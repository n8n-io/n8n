# syntax=docker/dockerfile:1
FROM node:24.14.1 AS base

RUN apt-get update && \
	apt-get install -y tini && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@0.33 && corepack enable

#
# Builder
FROM base AS builder

WORKDIR /app

# Workspace manifests (small, change rarely — kept in their own cache layer).
COPY --chown=node:node ./pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --chown=node:node ./pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --chown=node:node ./package.json /app/package.json

# Engine and its workspace deps' package manifests so pnpm can resolve the
# `workspace:*` references during install.
COPY --chown=node:node ./packages/@n8n/engine/package.json /app/packages/@n8n/engine/package.json
COPY --chown=node:node ./packages/@n8n/typescript-config/package.json /app/packages/@n8n/typescript-config/package.json
COPY --chown=node:node ./packages/@n8n/vitest-config/package.json /app/packages/@n8n/vitest-config/package.json

COPY --chown=node:node ./patches /app/patches
COPY --chown=node:node ./scripts /app/scripts

ENV DOCKER_BUILD=true
RUN pnpm install --frozen-lockfile --filter @n8n/engine...

# TS configs (shared + package-local) needed for the build.
COPY --chown=node:node ./packages/@n8n/typescript-config/tsconfig.common.json /app/packages/@n8n/typescript-config/tsconfig.common.json
COPY --chown=node:node ./packages/@n8n/typescript-config/tsconfig.build.json /app/packages/@n8n/typescript-config/tsconfig.build.json
COPY --chown=node:node ./packages/@n8n/typescript-config/tsconfig.backend.json /app/packages/@n8n/typescript-config/tsconfig.backend.json
COPY --chown=node:node ./packages/@n8n/engine/tsconfig.json /app/packages/@n8n/engine/tsconfig.json
COPY --chown=node:node ./packages/@n8n/engine/tsconfig.build.json /app/packages/@n8n/engine/tsconfig.build.json

# Source files
COPY --chown=node:node ./packages/@n8n/engine/src /app/packages/@n8n/engine/src

WORKDIR /app/packages/@n8n/engine
RUN pnpm build

#
# Runner
FROM base AS runner

COPY --from=builder /app /app

WORKDIR /app/packages/@n8n/engine
USER node

EXPOSE 3000
ENV NODE_ENV=production

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/serve.js"]
