# Use the official n8n Docker image
FROM n8nio/n8n

# Set environment variables (basic auth and permissions)
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=admin123
ENV N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true

# Run n8n on container start
CMD ["n8n"]
