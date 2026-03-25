FROM node:24.13.1

RUN apt-get update && apt-get install -y \
    python3 make g++ tini \
    && rm -rf /var/lib/apt/lists/*

# 1. Pre-Install pnpm to Corepack doesn't ask on run and block the process
ENV COREPACK_HOME=/home/node/.corepack
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

COPY . .

# 2. Install and Build
RUN rm -rf node_modules && CI=true pnpm install
RUN pnpm build --filter n8n

# 3. Create Tapis configuration
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL = 'https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT = '/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

# 4. Make sure n8n directory exists to prevent for Encryption key
RUN mkdir -p /home/node/.n8n /home/node/.corepack && \
    chown -R node:node /home/node /app

# 5. COREPACK_ENABLE_DOWNLOAD_PROMPT=0 
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

EXPOSE 5678
USER node

# 5. Clean run command
ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]