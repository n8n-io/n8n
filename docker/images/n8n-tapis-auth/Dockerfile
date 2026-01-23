FROM node:23

# 1. Herramientas del sistema
RUN apt-get update && apt-get install -y \
    python3 make g++ tini \
    && rm -rf /var/lib/apt/lists/*

# 2. pnpm 10.22.0
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# 3. Copia explícita de manifiestos
COPY package.json pnpm-lock.yaml ./

# 4. Copiar el resto del proyecto
COPY . .

# 5. EL TRUCO: Forzar modo CI y asegurar limpieza
# Borramos node_modules por si se coló desde el host
RUN rm -rf node_modules && CI=true pnpm install

# 6. Construir el proyecto
RUN pnpm build

# 7. Configuración Tapis
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL = 'https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT = '/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

RUN chown -R node:node /app
EXPOSE 5678
USER node

ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]
