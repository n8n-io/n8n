FROM node:22-bookworm AS builder

WORKDIR /app

# 1. Dependencias esenciales
RUN apt-get update && apt-get install -y build-essential python3 git && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

COPY . .

# 2. Neutralización total de scripts de Git/Hooks
RUN npm pkg set scripts.prepare="echo 'Bypassing'" && \
    npm pkg set scripts.prebuild="echo 'Bypassing'" && \
    find . -name "package.json" -exec sed -i '/"prepare":/d' {} +

# 3. Instalación de dependencias
ENV PNPM_SKIP_PREPARE=1
RUN pnpm install --no-frozen-lockfile

# 4. PARCHE PARA BUILD: Aseguramos esbuild y tipos de Node
# A veces los sub-paquetes pierden el acceso a los tipos globales en el contenedor
RUN pnpm add -Dw @esbuild/linux-x64 @types/node

# 5. CONSTRUCCIÓN PASO A PASO (Evita el colapso de Turbo)
# Primero los paquetes base de los que todos dependen
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Construimos en orden de jerarquía para asegurar que 'expression-runtime' tenga sus dependencias listas
RUN pnpm turbo run build --filter=@n8n/utils... && \
    pnpm turbo run build --filter=@n8n/workflow... && \
    pnpm turbo run build --filter=@n8n/expression-runtime...

# Finalmente, intentamos el build general para los paquetes restantes (CLI y Editor)
RUN pnpm build

# --- ETAPA FINAL ---
FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5678
ENV HOME=/tmp
CMD ["node", "packages/cli/bin/n8n"]