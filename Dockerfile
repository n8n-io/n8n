# Use a versão mais recente da imagem oficial do n8n como base
FROM docker.n8n.io/n8nio/n8n:latest

# Copia o nosso script de inicialização para dentro da imagem
COPY startup.sh /

# Muda para o usuário root para alterar as permissões do arquivo
USER root
RUN chmod +x /startup.sh

# Retorna para o usuário padrão 'node' para a execução da aplicação
USER node

# Define o nosso script como o ponto de entrada do contêiner.
# Ele será executado antes do processo principal do n8n.
ENTRYPOINT ["/bin/sh", "/startup.sh"]
