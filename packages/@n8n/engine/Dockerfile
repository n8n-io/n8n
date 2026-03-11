# Multi-stage Dockerfile for the Engine v2 backend
#
# Build context: monorepo root (../../../)
# Uses Dockerfile.dockerignore for context filtering
#
# Targets:
#   dev  — runs with tsx watch for hot-reload (no build step)
#   prod — builds TypeScript + frontend, runs compiled JS

# ── Base ──────────────────────────────────────────────
FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace root files for pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy patches (referenced by lockfile) and scripts (preinstall hook)
COPY patches/ patches/
COPY scripts/ scripts/

# Copy engine package manifest
COPY packages/@n8n/engine/package.json packages/@n8n/engine/

# Copy workspace dependency manifests
COPY packages/@n8n/typescript-config/ packages/@n8n/typescript-config/

# Install backend dependencies
# --ignore-scripts: skip root prepare (lefthook needs git, not available in Alpine)
# --no-frozen-lockfile: engine package isn't in the lockfile yet
RUN pnpm install --filter=@n8n/engine --no-frozen-lockfile --ignore-scripts

# ── Development ───────────────────────────────────────
FROM base AS dev

COPY packages/@n8n/engine/src/ packages/@n8n/engine/src/
COPY packages/@n8n/engine/examples/ packages/@n8n/engine/examples/
COPY packages/@n8n/engine/tsconfig.json packages/@n8n/engine/
COPY packages/@n8n/engine/tsconfig.build.json packages/@n8n/engine/

WORKDIR /app/packages/@n8n/engine

EXPOSE 3100

# tsx watch for hot-reload (source mounted as volume in docker-compose)
CMD ["npx", "tsx", "watch", "src/main.ts"]

# ── Build ─────────────────────────────────────────────
FROM base AS build

COPY packages/@n8n/engine/src/ packages/@n8n/engine/src/
COPY packages/@n8n/engine/tsconfig.json packages/@n8n/engine/
COPY packages/@n8n/engine/tsconfig.build.json packages/@n8n/engine/

WORKDIR /app/packages/@n8n/engine

# Build backend TypeScript
RUN npx tsc -p tsconfig.build.json

# Build frontend if web source exists
RUN if [ -f src/web/package.json ]; then \
      cd src/web && pnpm install && npx vite build; \
    fi

# ── Production ────────────────────────────────────────
FROM node:22-alpine AS prod

WORKDIR /app/packages/@n8n/engine

# Copy only what's needed to run
COPY --from=base /app/node_modules/ /app/node_modules/
COPY --from=base /app/packages/@n8n/engine/node_modules/ ./node_modules/
COPY --from=build /app/packages/@n8n/engine/dist/ ./dist/
COPY --from=base /app/packages/@n8n/engine/package.json ./

EXPOSE 3100

CMD ["node", "dist/main.js"]
