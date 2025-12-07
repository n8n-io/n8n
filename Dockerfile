# Start from the official n8n Docker image (use your current version or 'latest')
FROM n8nio/n8n:latest

# Switch to the root user to gain permission for global npm install
USER root

# Install the steamdb-js package globally
# The '--prefix' flag ensures it is installed in a location accessible by n8n
RUN npm install --prefix /usr/local/lib/node_modules steamdb-js

# Switch back to the non-root user (important for security)
USER node
