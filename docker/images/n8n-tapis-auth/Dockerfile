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

# 1. Copia de configuraciones de raíz
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY patches/ ./patches/

# 2. COPIA DE PAQUETES (NECESARIO PARA EL WORKSPACE)
# Copiamos la carpeta packages ANTES del install para que pnpm encuentre 
# los paquetes internos como @n8n/eslint-config
COPY packages/ ./packages/

# 3. CONFIGURACIÓN DE PNPM (Hoisting)
RUN echo "shamefully-hoist=true" > .npmrc && \
    echo "public-hoist-pattern[]='*'" >> .npmrc

# 4. INSTALACIÓN
# Ahora pnpm verá todos los paquetes en packages/ y no lanzará el error de "not found"
RUN CI=true pnpm install --ignore-scripts --no-frozen-lockfile

# 5. PARCHES DE TIPOS Y COMPILACIÓN NATIVA
# Fix PSL
RUN mkdir -p node_modules/@types/psl && \
    printf 'declare module "psl";' > node_modules/@types/psl/index.d.ts

# Compilación de SQLite (Node 23)
RUN SQLITE3_PATH=$(find node_modules/.pnpm -name "sqlite3" -type d | head -n 1) && \
    cd $SQLITE3_PATH && npm install --build-from-source

# 6. BUILD FINAL
RUN pnpm build

# Comando por defecto (ajusta según tu despliegue en TACC/Render)
CMD ["pnpm", "start"]

# Run from root:
# sudo docker build -t n8n-tapis-auth:latest -f docker/images/n8n/Dockerfile .