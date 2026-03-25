FROM node:24.13.1

RUN apt-get update && apt-get install -y \
    python3 make g++ tini \
    && rm -rf /var/lib/apt/lists/*

ENV COREPACK_HOME=/home/node/.corepack
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# Aumentamos memoria para el build
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY . .

# --- EL PASO CLAVE: Borramos el script "prepare" que causa el error de Git/Lefthook ---
RUN sed -i '/"prepare":/d' package.json

# 2. Instalación (usamos --ignore-scripts para estar seguros)
RUN rm -rf node_modules && CI=true pnpm install --no-frozen-lockfile --ignore-scripts

# 3. Instalamos esbuild y compilamos n8n
RUN pnpm add -Dw esbuild --ignore-scripts
RUN pnpm build --filter n8n

# 4. Configuración Tapis
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL = 'https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT = '/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

RUN mkdir -p /home/node/.n8n /home/node/.corepack && \
    chown -R node:node /home/node /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
EXPOSE 5678
USER node

ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]