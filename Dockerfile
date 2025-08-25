# n8n Dockerfile for Doprax Deployment
# Based on the official n8n Docker image

FROM docker.n8n.io/n8nio/n8n:latest

# Set working directory
WORKDIR /home/node

# Create necessary directories
RUN mkdir -p /home/node/.n8n /files

# Set environment variables
ENV NODE_ENV=production
ENV N8N_PORT=5678
ENV N8N_RUNNERS_ENABLED=true
ENV N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true

# Expose the n8n port
EXPOSE 5678

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5678/healthz || exit 1

# Start n8n
CMD ["n8n"]
