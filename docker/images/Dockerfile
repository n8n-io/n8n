FROM node:18

WORKDIR /app

# Copy package.json, pnpm-lock.yaml, and the patches directory
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN pnpm run build

CMD ["pnpm", "start"]
