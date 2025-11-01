# Usa a imagem oficial do n8n
FROM n8nio/n8n:latest

# Expõe a porta padrão do n8n
EXPOSE 5678

# Define variáveis de ambiente padrão (opcional, pode ser sobrescrito no Render)
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=senha_segura
ENV N8N_HOST=0.0.0.0
ENV N8N_PORT=5678
ENV N8N_PROTOCOL=http
