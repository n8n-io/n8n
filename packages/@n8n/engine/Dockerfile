# Multi-stage Dockerfile for the Engine v2
#
# Build context: monorepo root (../../../)
#
# Targets:
#   dev  — API with tsx watch, source mounted as volumes
#   web  — Frontend Vite dev server, source mounted as volumes
#   prod — Built TypeScript + frontend

FROM node:22-alpine AS base

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
RUN echo '{"name":"n8n-monorepo","private":true}' > package.json

COPY packages/@n8n/engine/package.json packages/@n8n/engine/
COPY packages/@n8n/typescript-config/ packages/@n8n/typescript-config/

RUN pnpm install --filter=@n8n/engine... --no-frozen-lockfile --ignore-scripts

# ── API Development ───────────────────────────────────
FROM base AS dev

COPY packages/@n8n/engine/ packages/@n8n/engine/

WORKDIR /app/packages/@n8n/engine
EXPOSE 3100
CMD ["npx", "tsx", "watch", "src/main.ts"]

# ── Web Development ───────────────────────────────────
FROM node:22-alpine AS web

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY packages/@n8n/engine/src/web/package.json ./
RUN pnpm install

COPY packages/@n8n/engine/src/web/ ./

EXPOSE 3200
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "3200"]

# ── Build ─────────────────────────────────────────────
FROM base AS build

COPY packages/@n8n/engine/ packages/@n8n/engine/

WORKDIR /app/packages/@n8n/engine
RUN npx tsc -p tsconfig.build.json
RUN cd src/web && pnpm install && npx vite build

# ── Production ────────────────────────────────────────
FROM node:22-alpine AS prod

WORKDIR /app/packages/@n8n/engine
COPY --from=base /app/node_modules/ /app/node_modules/
COPY --from=base /app/packages/@n8n/engine/node_modules/ ./node_modules/
COPY --from=build /app/packages/@n8n/engine/dist/ ./dist/
COPY --from=build /app/packages/@n8n/engine/examples/ ./examples/
COPY --from=base /app/packages/@n8n/engine/package.json ./

EXPOSE 3100
CMD ["node", "dist/main.js"]
