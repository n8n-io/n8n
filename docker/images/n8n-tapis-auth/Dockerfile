FROM node:24-bookworm AS builder

WORKDIR /app

# 1. Herramientas de sistema
RUN apt-get update && apt-get install -y build-essential python3 git && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

COPY . .

# 2. LIMPIEZA TOTAL DE DEPENDENCIAS FANTASMA
# Borramos las carpetas físicas
RUN rm -rf packages/@n8n/eslint-plugin-community-nodes \
           packages/@n8n/eslint-config \
           packages/eslint-config

# Buscamos en TODOS los package.json del proyecto y borramos las líneas 
# que mencionen los paquetes eliminados. Esto limpia node-cli y cualquier otro.
RUN find . -name "package.json" -exec sed -i '/@n8n\/eslint-plugin-community-nodes/d' {} + && \
    find . -name "package.json" -exec sed -i '/@n8n\/eslint-config/d' {} + && \
    find . -name "package.json" -exec sed -i '/"prepare":/d' {} +

# 3. Instalación (Ya no debería haber quejas de 'workspace package not found')
ENV PNPM_SKIP_PREPARE=1
RUN pnpm install --no-frozen-lockfile

# 4. Binarios nativos necesarios
RUN pnpm add -Dw @esbuild/linux-x64
RUN pnpm rebuild isolated-vm sqlite3

# 5. BUILD
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm build

# --- ETAPA FINAL ---
FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5678
CMD ["node", "packages/cli/bin/n8n"]