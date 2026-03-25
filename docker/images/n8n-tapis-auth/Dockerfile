# 1. Usamos Bookworm porque es más parecido a un entorno Ubuntu/Debian manual
FROM node:20-bookworm

# 2. Equivalente a tu paso 50 (apt update & upgrade) + dependencias de C++
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y python3 make g++ git tini && \
    rm -rf /var/lib/apt/lists/*

# 3. Equivalente a tus pasos 51 y 52
ENV COREPACK_HOME=/home/node/.corepack
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# 4. TRUCO CRUCIAL: Engañamos a Lefthook creando un git falso
# Esto evita que el paso 53 (pnpm install) falle.
RUN git init

# Copiamos todo el proyecto
COPY . .

# 5. Equivalente a tu paso 53
# Usamos --no-frozen-lockfile por si acaso hay cambios de versiones
RUN pnpm install --no-frozen-lockfile

# 6. Equivalente a tus pasos 54 y 55 (Build)
# Aumentamos la memoria para que no explote el compilador de TS
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm build --filter n8n... --continue

# 7. Configuración de archivos Tapis (como en los intentos anteriores)
RUN mkdir -p /app/packages/cli/bin && \
    echo "TAPIS_BASE_URL='https://portals.tapis.io'" > /app/packages/cli/bin/.env.tapis && \
    echo "TAPIS_AUTH_ENDPOINT='/v3/oauth2/tokens'" >> /app/packages/cli/bin/.env.tapis

EXPOSE 5678

# 8. Equivalente a tu paso 56
ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]