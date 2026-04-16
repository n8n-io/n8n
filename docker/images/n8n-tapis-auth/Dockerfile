# Created by: Sebastián Sterling
FROM node:23-bullseye

# 1. System tools and headers
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# pnpm configuration
RUN npm install -g pnpm

WORKDIR /app

# 1. Configuration COPY from root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY patches/ ./patches/

# 2. Packages COPY
COPY packages/ ./packages/

# 3. PNPM configuration (Hoisting)
RUN echo "shamefully-hoist=true" > .npmrc && \
    echo "public-hoist-pattern[]='*'" >> .npmrc

# 4. Packages installation
RUN CI=true pnpm install --ignore-scripts --no-frozen-lockfile

# 5. Types patch and Native compilation
RUN mkdir -p node_modules/@types/psl && \
    printf 'declare module "psl";' > node_modules/@types/psl/index.d.ts

# SQLite Compilation for Node 23
RUN SQLITE3_PATH=$(find node_modules/.pnpm -name "sqlite3" -type d | head -n 1) && \
    cd $SQLITE3_PATH && npm install --build-from-source

# 6. Final BUILD
RUN pnpm build

# Default command to start n8n
CMD ["pnpm", "start"]

# Run from root:
# sudo docker build -t n8n-tapis-auth:latest -f docker/images/n8n/Dockerfile .