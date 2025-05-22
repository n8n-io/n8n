FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install n8n
RUN npm install n8n -g

# Expose default n8n port
EXPOSE 5678

# Set environment variables
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=admin123
ENV N8N_ENCRYPTION_KEY=32charactersecrethere1234567890123
ENV N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true

# Start n8n
CMD ["n8n"]
