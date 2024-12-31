# # Base Node.js image
# FROM node:18-alpine

# # Set working directory
# WORKDIR /app

# # Copy package manager files and install dependencies
# COPY pnpm-workspace.yaml ./
# COPY pnpm-lock.yaml ./
# COPY packages ./packages
# COPY patches ./patches
# COPY tsconfig.json ./tsconfig.json
# COPY tsconfig.build.json ./tsconfig.build.json
# COPY package.json ./package.json

# # Install dependencies
# RUN npm install -g pnpm && pnpm install --frozen-lockfile

# # Copy the rest of the application
# COPY . .

# # Expose the port n8n runs on
# EXPOSE 5678

# # Start the application
# CMD ["pnpm", "start"]

# Commenting previous content and adding new content

# Base Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install n8n directly using npm
RUN npm install n8n -g

# Set environment variables
ENV NODE_ENV=production
ENV N8N_PORT=5678

# Expose the port n8n runs on
EXPOSE 5678

# Start n8n
CMD ["n8n", "start"]