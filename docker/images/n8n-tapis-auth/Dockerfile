# ETAPA 1: Build
FROM node:20-bookworm AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential python3 git
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

COPY . .
# Forzamos instalación limpia
RUN pnpm install --no-frozen-lockfile
RUN pnpm build

# ETAPA 2: Producción
FROM node:20-bookworm-slim
WORKDIR /app
COPY --from=builder /app .
# Aquí solo corres n8n
EXPOSE 5678
CMD ["pnpm", "start"]