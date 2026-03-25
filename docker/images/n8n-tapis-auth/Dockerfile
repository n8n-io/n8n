FROM node:20

RUN apt-get update && apt-get install -y \
    python3 make g++ tini \
    && rm -rf /var/lib/apt/lists/*

ENV COREPACK_HOME=/home/node/.corepack
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Forzamos a pnpm a que los tipos sean visibles en todo el proyecto
RUN echo "public-hoist-pattern[]=@types/*" > .npmrc
RUN echo "shamefully-hoist=true" >> .npmrc

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY . .

# Eliminamos el script que rompe el build por falta de Git
RUN sed -i '/"prepare":/d' package.json

# Instalación sin ignorar scripts (para que se generen los tipos) 
# pero omitiendo la congelación del lockfile
RUN rm -rf node_modules && CI=true pnpm install --no-frozen-lockfile

# BUILD: Intentamos compilar, pero si hay errores de tipos menores, que no se detenga
RUN pnpm build --filter n8n... --filter=!@n8n/eslint-plugin-community-nodes --continue

# Configuración Tapis
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL = 'https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT = '/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

RUN chown -R node:node /home/node /app
USER node
ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]