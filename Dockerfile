# Use the official n8n Docker image
FROM n8nio/n8n

# Set basic authentication (change in Render if needed)
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=admin123

# Default command to run n8n
CMD ["n8n"]
