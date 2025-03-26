FROM n8nio/n8n:latest

# Configure npm to install global packages in the user's home directory
# The n8n image runs as a user with uid 1000 named 'node'
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

# Switch to the node user before installing packages
USER node
RUN npm install -g axios

# Switch back to the default user if needed (optional)
USER root
