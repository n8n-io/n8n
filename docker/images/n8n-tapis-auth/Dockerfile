FROM node:23-bookworm AS builder

WORKDIR /app

# 1. Dependencias de sistema
RUN apt-get update && apt-get install -y build-essential python3 git && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

COPY . .

# 2. LIMPIEZA AGRESIVA (La solución nuclear)
# Borramos físicamente los paquetes de linting que explotan en Node 24
RUN rm -rf packages/@n8n/eslint-plugin-community-nodes \
           packages/@n8n/eslint-config \
           packages/eslint-config

# Eliminamos las referencias en el package.json raíz y sub-packages para que pnpm no los busque
RUN sed -i '/@n8n\/eslint-plugin-community-nodes/d' package.json && \
    sed -i '/@n8n\/eslint-config/d' package.json && \
    sed -i '/"prepare":/d' package.json

# 3. Instalación (Bypass de scripts de n8n)
ENV PNPM_SKIP_PREPARE=1
RUN pnpm install --no-frozen-lockfile

# 4. Aseguramos binarios nativos
RUN pnpm add -Dw @esbuild/linux-x64
RUN pnpm rebuild isolated-vm sqlite3

# 5. BUILD FINAL
# Ahora que los paquetes problemáticos no existen, un build normal debería pasar
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm build

# --- ETAPA FINAL ---
FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5678
CMD ["node", "packages/cli/bin/n8n"]