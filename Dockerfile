FROM n8nio/n8n

ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=admin123
ENV N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true

# Manually fix file permission
RUN mkdir -p /home/node/.n8n && chmod 600 /home/node/.n8n/config || true

CMD ["n8n"]
