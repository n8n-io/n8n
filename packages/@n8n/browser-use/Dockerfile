# Build stage - separate to keep runtime image small
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json tsconfig.json ./

# Install dependencies
RUN pnpm install --no-lockfile

# Copy source and build
COPY src ./src
RUN pnpm build

# Prune dev dependencies for smaller runtime
RUN pnpm prune --prod

# Runtime stage
FROM node:20-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive

# Install Chromium and minimal dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-dejavu-core \
    # Minimal utils
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy built application (production deps only)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create non-root user for security
RUN useradd -m -s /bin/bash browseruse && \
    chown -R browseruse:browseruse /app

USER browseruse

EXPOSE 8766

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8766/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/server.js"]
