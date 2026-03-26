
FROM node:23

RUN apt-get update && apt-get install -y \
    python3 make g++ tini \
    && rm -rf /var/lib/apt/lists/*

# 1. Pre-Install pnpm to Corepack doesn't ask on run and block the process
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml turbo.json ./
COPY . .

# 2. Install and Build
# RUN npm pkg delete scripts.prepare

# # 3. Instalación con "Fuerza Bruta" para Esbuild
# # Añadimos esbuild explícitamente al workspace para que esté disponible globalmente
# RUN pnpm install --no-frozen-lockfile && \
#     pnpm add -w esbuild@0.25.0 @esbuild/linux-x64


# ENV NODE_OPTIONS="--max-old-space-size=8192"
# RUN pnpm turbo run build --filter=n8n...



RUN rm -rf packages/@n8n/eslint-plugin-community-nodes && \
    sed -i '/packages\/@n8n\/eslint-plugin-community-nodes/d' pnpm-workspace.yaml

# 3. Bypass de scripts de Git en el package.json principal
RUN sed -i '/"prepare":/d' package.json

# 4. Instalación limpia
# Al haberlo borrado del workspace, pnpm install ya no lo verá
RUN pnpm install --no-frozen-lockfile && \
    pnpm add -w esbuild@0.25.0 @esbuild/linux-x64

# 5. BUILD FINAL
# Ahora n8n... solo construirá lo que realmente existe y es necesario
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm turbo run build --filter=n8n...





# 3. Create Tapis configuration
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL = 'https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT = '/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

# 4. Make sure n8n directory exists to prevent for Encryption key
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node /app

EXPOSE 5678
USER node

# 5. Clean run command
ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]