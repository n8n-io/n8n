# Cambiamos a Node 22 (LTS), mucho más compatible con el stack de n8n
FROM node:22-bookworm AS builder

WORKDIR /app

# 1. Dependencias de sistema y Python para módulos nativos
RUN apt-get update && apt-get install -y build-essential python3 git && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

# 2. Copiamos solo los archivos de configuración primero para optimizar caché
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/cli/package.json packages/cli/package.json
# (Añadimos el resto de la estructura si es necesario, o COPY . . para simplificar)
COPY . .

# 3. Bypass de Scripts Problemáticos
# En lugar de borrar archivos, solo saltamos el 'prepare' que pide Git
ENV PNPM_SKIP_PREPARE=1

# Instalación sin ignorar scripts (necesario para esbuild/swc)
RUN pnpm install --no-frozen-lockfile

# 4. Forzamos arquitectura de esbuild para el contenedor
RUN pnpm add -Dw @esbuild/linux-x64

# 5. Compilamos módulos de C++ (Vital para el nodo Code y SQLite)
RUN pnpm rebuild isolated-vm sqlite3

# 6. BUILD FINAL
# Usamos el comando estándar de n8n. Node 22 gestiona mejor la memoria.
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm build

# --- ETAPA FINAL (Imagen ligera) ---
FROM node:22-bookworm-slim
WORKDIR /app

# Copiamos solo lo necesario del builder
COPY --from=builder /app .

EXPOSE 5678

# Variable de entorno para evitar problemas de permisos en TACC
ENV HOME=/tmp

CMD ["node", "packages/cli/bin/n8n"]