FROM n8nio/base:22

# Instala pip para poder instalar las librerías de Python
RUN apk add --no-cache python3-pip

RUN apk add --no-cache --update openssh sudo shadow bash
RUN echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/node && chmod 0440 /etc/sudoers.d/node
RUN mkdir /workspaces && chown node:node /workspaces
RUN npm install -g pnpm

# Instala las librerías de Python para Vanna.ai
RUN pip install vanna
RUN pip install psycopg2-binary

USER node
RUN mkdir -p ~/.pnpm-store && pnpm config set store-dir ~/.pnpm-store --global
