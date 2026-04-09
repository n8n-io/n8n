FROM node:23-bookworm

RUN apt-get update && apt-get install -y \
    python3 make g++ tini \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# Copiamos solo lo necesario para instalar
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copiamos el resto (Asegúrate de tener el .dockerignore con node_modules)
COPY . .

# INSTALACIÓN: Usamos --ignore-scripts para que no intente correr 
# lefthook ni buscar carpetas .git inexistentes.
RUN CI=true pnpm install --ignore-scripts

RUN pnpm add -Dw @types/psl -w --ignore-scripts

# BUILD: Aquí turbo se encarga de compilar todo
RUN pnpm build

# Configuración Tapis
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL = 'https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT = '/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node /app

EXPOSE 5678
USER node

ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]

# Run from root:
# sudo docker build -t n8n-tapis-auth:latest -f docker/images/n8n/Dockerfile .