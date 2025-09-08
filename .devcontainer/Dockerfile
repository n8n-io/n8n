# Usa una imagen base
FROM n8nio/base:22

# Instala todas las dependencias de sistema y Node.js
RUN apk add --no-cache --update openssh sudo shadow bash \
    && echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node \
    && npm install -g pnpm \
    && mkdir /workspaces && chown node:node /workspaces

# Instala pip para poder instalar las librerías de Python
RUN apk add --no-cache py3-pip

# Instala las librerías de Python para Vanna.ai
RUN pip install vanna psycopg2-binary --break-system-packages

USER node
RUN mkdir -p ~/.pnpm-store && pnpm config set store-dir ~/.pnpm-store --global
