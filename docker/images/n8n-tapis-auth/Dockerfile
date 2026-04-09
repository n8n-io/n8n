# Usa la imagen de Node 23 (ajusta a la versión específica si es necesario)
FROM node:23-bullseye

# 1. HERRAMIENTAS DE SISTEMA + HEADERS
# Instalamos lo necesario para compilar módulos nativos de C++
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Configurar pnpm
RUN npm install -g pnpm

WORKDIR /app

# 1. Copia los archivos de configuración del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 2. COPIA LA CARPETA DE PATCHES (CRUCIAL)
# Sin esto, pnpm install fallará al intentar aplicar parches de dependencias
COPY patches/ ./patches/

# 3. Copia el resto del código (o al menos los package.json de los paquetes si usas turbo prune)
COPY packages/ ./packages/

# 4. INSTALACIÓN DE DEPENDENCIAS
# Ahora pnpm encontrará /app/patches/bull@4.16.4.patch y podrá continuar
RUN CI=true pnpm install --ignore-scripts --no-frozen-lockfile

# ... (Pasos de Fix de PSL y Rebuild de SQLite permanecen igual)

RUN pnpm build

# Comando por defecto (ajusta según tu despliegue en TACC/Render)
CMD ["pnpm", "start"]

# Run from root:
# sudo docker build -t n8n-tapis-auth:latest -f docker/images/n8n/Dockerfile .