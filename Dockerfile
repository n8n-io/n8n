# Use n8n's official base image with Node.js 20
FROM n8nio/base:20

# Install dependencies (Alpine Linux-based)
RUN apk add --no-cache --update openssh sudo shadow bash

# Set up sudo permissions
RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node && chmod 0440 /etc/sudoers.d/node

# Create workspace & set ownership
RUN mkdir /workspaces && chown node:node /workspaces

# Switch to node user
USER node

# Ensure pnpm is installed
RUN mkdir -p ~/.pnpm-store && pnpm config set store-dir ~/.pnpm-store --global

# Set working directory
WORKDIR /app

# Copy project files
COPY --chown=node:node . .

# Install dependencies
RUN npm ci

# Expose n8n's default port
EXPOSE 5678

# Start n8n
CMD ["node", "packages/cli/bin/n8n"]