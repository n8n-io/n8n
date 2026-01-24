FROM node:23

# 1. Herramientas del sistema
RUN apt-get update && apt-get install -y \
    python3 make g++ tini \
    && rm -rf /var/lib/apt/lists/*

# 2. Configurar pnpm 10.22.0
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# 3. Copiar todo el proyecto (esto incluye package.json y packages/)
COPY . .

# 4. Forzar modo CI para evitar el error de TTY y limpiar node_modules
RUN rm -rf node_modules && CI=true pnpm install

# 5. Construir el proyecto
RUN pnpm build

# 6. Configuración Tapis
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL = 'https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT = '/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

# 7. Permisos para el usuario node
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node /app

EXPOSE 5678
USER node

ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]