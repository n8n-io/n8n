# Usa la versión LTS más reciente de Node 20 para evitar el bug de V8
FROM node:20.18-bookworm

# 1. Instalamos TODO lo necesario para compilar C++
# 'build-essential' es clave, ya que trae g++ y make configurados
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y build-essential python3 git tini && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# 2. Engañamos a los scripts de n8n que buscan un repo git
RUN git init

COPY . .

# 3. Antes del install, limpiamos cualquier rastro de instalaciones previas
# y forzamos a que pnpm compile los módulos nativos
RUN pnpm install --no-frozen-lockfile

# 4. El Build (pasos 54 y 55 tuyos)
# Aumentamos memoria para evitar "JavaScript heap out of memory"
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm build --filter n8n... --continue

# 5. Configuración Tapis
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL='https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT='/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

EXPOSE 5678

ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]