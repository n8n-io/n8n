FROM n8nio/n8n:latest

# Switch to root to create the directory and adjust permissions
USER root
RUN mkdir -p /data/custom-nodes && chown -R node:node /data/custom-nodes

# Switch back to the non-root "node" user
USER node

# Copy project files into the container and set working directory
COPY . /data/custom-nodes
WORKDIR /data/custom-nodes

# Temporarily set NODE_ENV to development to install devDependencies (like tsc)
ENV NODE_ENV=development

# Install dependencies and build the project using pnpm
RUN pnpm install && pnpm run build

# Optionally, revert NODE_ENV to production for runtime if needed
ENV NODE_ENV=production

# Set environment variable so n8n can detect your custom nodes
ENV N8N_CUSTOM_EXTENSIONS="/data/custom-nodes/dist/nodes"

EXPOSE 5678
#CMD ["node", "/usr/local/lib/node_modules/n8n/bin/n8n", "start"]

