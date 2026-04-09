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

# ... (Pasos anteriores de apt-get permanecen igual)

WORKDIR /app

# 1. Copia de archivos de configuración
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY patches/ ./patches/

# 2. CONFIGURACIÓN DE PNPM (EL FIX)
# Forzamos el hoisting para que paquetes como zod-to-json-schema sean visibles globalmente
# Esto evita el error TS2307 en @n8n/agents
RUN pnpm config set shamefully-hoist true && \
    pnpm config set public-hoist-pattern[] "*"

# 3. INSTALACIÓN
# Añadimos --shamefully-hoist por seguridad extra en el comando
RUN CI=true pnpm install --ignore-scripts --no-frozen-lockfile --shamefully-hoist

# 4. COPIA DE CÓDIGO
COPY packages/ ./packages/

# 5. LOS PARCHES QUE YA FUNCIONAN
# Fix PSL
RUN mkdir -p node_modules/@types/psl && \
    printf 'declare module "psl";' > node_modules/@types/psl/index.d.ts

# Fix SQLite (Compilación nativa)
RUN SQLITE3_PATH=$(find node_modules/.pnpm -name "sqlite3" -type d | head -n 1) && \
    cd $SQLITE3_PATH && npm install --build-from-source

# 6. BUILD FINAL
RUN pnpm build

# Comando por defecto (ajusta según tu despliegue en TACC/Render)
CMD ["pnpm", "start"]

# Run from root:
# sudo docker build -t n8n-tapis-auth:latest -f docker/images/n8n/Dockerfile .