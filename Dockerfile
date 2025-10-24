FROM n8nio/n8n:latest

# Рабочая директория для данных
WORKDIR /data

# Папка для постоянного хранения
VOLUME ["/data"]

# Настройки
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_BASIC_AUTH_PASSWORD=mypassword123
ENV N8N_ENCRYPTION_KEY=secret123key
ENV N8N_HOST=0.0.0.0
ENV N8N_PORT=5678
ENV N8N_PROTOCOL=https
ENV GENERIC_TIMEZONE=Europe/Tel_Aviv

# Запуск n8n
CMD ["n8n", "start"]
