FROM node:24.13.1

RUN apt-get update && apt-get install -y \
    python3 make g++ tini \
    && rm -rf /var/lib/apt/lists/*

# 1. Pre-Install pnpm to Corepack doesn't ask on run and block the process
ENV COREPACK_HOME=/home/node/.corepack

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json* ./
COPY . .

RUN sed -i '/"prepare":/d' package.json

# 2. Install ignoring conflictive scripts
RUN rm -rf node_modules && CI=true pnpm install --no-frozen-lockfile --ignore-scripts

# 3. Selective Build 
# Compile just with n8n direct dependencies, ignoring testing packages
RUN pnpm add -Dw esbuild --ignore-scripts
RUN pnpm exec turbo run build --filter=n8n...

# 4. Create Tapis configuration
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL = 'https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT = '/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

# 5. Make sure n8n directory exists to prevent for Encryption key
RUN mkdir -p /home/node/.n8n /home/node/.corepack && \
    chown -R node:node /home/node /app

# 6. COREPACK_ENABLE_DOWNLOAD_PROMPT=0 
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

EXPOSE 5678
USER node

# 7. Clean run command
ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]