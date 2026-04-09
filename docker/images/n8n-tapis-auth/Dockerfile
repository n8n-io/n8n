FROM node:23-bookworm

RUN apt-get update && apt-get install -y \
    python3 make g++ tini \
    && rm -rf /var/lib/apt/lists/*

# 1. Habilitar corepack y preparar pnpm
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# 2. Copiar primero archivos de configuración para aprovechar el caché de capas
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 3. Copiar el resto del código (Asegúrate de tener el .dockerignore configurado)
COPY . .

# 4. Instalación de dependencias
# CI=true evita prompts interactivos y optimiza la instalación
RUN CI=true pnpm install --ignore-scripts

# 5. FIX: Instalar tipos de 'psl' explícitamente para solucionar el error de TS2688
# Lo añadimos al workspace para que esté disponible durante el build de turbo
RUN pnpm add -Dw @types/psl --ignore-scripts && \
    pnpm add -w esbuild@0.25.0 @esbuild/linux-x64 --ignore-scripts

# 6. Build de todos los paquetes del monorepo
RUN pnpm build

# 7. Configuración específica de Tapis (n8n-tapis-auth)
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL = 'https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT = '/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

# 8. Preparar directorio de datos y permisos
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node /app
ENV NODE_OPTIONS="--max-old-space-size=8192"


EXPOSE 5678
USER node

ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]

# Run from root:
# sudo docker build -t n8n-tapis-auth:latest -f docker/images/n8n/Dockerfile .