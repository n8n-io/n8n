# 1. Bajamos a Node 20 (LTS) - Mucho más estable para n8n
FROM node:24-bookworm AS builder

WORKDIR /app

# 1. Dependencias de compilación básicas
RUN apt-get update && apt-get install -y build-essential python3 && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

COPY . .

# 2. INSTALACIÓN: Ignoramos TODOS los scripts de los paquetes (adiós Lefthook/Git)
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# 3. COMPILACIÓN SELECTIVA: Ahora sí, compilamos solo los módulos nativos
# que n8n necesita para funcionar (el nodo Code y la base de datos)
RUN pnpm rebuild isolated-vm sqlite3

# 4. BUILD DE N8N: Sin que nada nos detenga
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm add -Dw esbuild --ignore-scripts
RUN pnpm build

# --- ETAPA FINAL ---
FROM node:20-bookworm-slim
WORKDIR /app

# Copiamos solo lo necesario del builder
COPY --from=builder /app .

# Exponemos el puerto de n8n
EXPOSE 5678

# Ejecución directa sin pasar por pnpm si es posible, o usando el start
CMD ["node", "packages/cli/bin/n8n"]