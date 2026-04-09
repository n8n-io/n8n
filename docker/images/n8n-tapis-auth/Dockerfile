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

# 1. Copia de archivos de configuración iniciales
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY patches/ ./patches/

# 2. CONFIGURACIÓN DE PNPM VIA .NPMRC (EL FIX DEFINITIVO)
# Usamos echo para crear el archivo de configuración sin pasar por el CLI de pnpm
# Esto fuerza el hoisting total y evita el error de "Unexpected token"
RUN echo "shamefully-hoist=true" > .npmrc && \
    echo "public-hoist-pattern[]='*'" >> .npmrc

# 3. INSTALACIÓN
# Con el .npmrc ya en su sitio, pnpm aplicará el hoisting automáticamente
RUN CI=true pnpm install --ignore-scripts --no-frozen-lockfile

# 4. COPIA DE CÓDIGO
COPY packages/ ./packages/

# 5. PARCHES Y COMPILACIÓN NATIVA
# Fix PSL tipos
RUN mkdir -p node_modules/@types/psl && \
    printf 'declare module "psl";' > node_modules/@types/psl/index.d.ts

# Compilación de SQLite para Node 23
RUN SQLITE3_PATH=$(find node_modules/.pnpm -name "sqlite3" -type d | head -n 1) && \
    cd $SQLITE3_PATH && npm install --build-from-source

# 6. BUILD FINAL
RUN pnpm build

# Comando por defecto (ajusta según tu despliegue en TACC/Render)
CMD ["pnpm", "start"]

# Run from root:
# sudo docker build -t n8n-tapis-auth:latest -f docker/images/n8n/Dockerfile .