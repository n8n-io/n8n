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

# Copia los archivos de definición del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/

# 2. INSTALACIÓN DE DEPENDENCIAS (EL "EVITA-ERRORES")
# --ignore-scripts evita que falle por falta de carpeta .git (Lefthook/Git hooks)
RUN CI=true pnpm install --ignore-scripts --no-frozen-lockfile

# 3. PARCHE DE TIPOS (PSL)
# Soluciona el error TS2688 inyectando la definición de tipos faltante
RUN mkdir -p node_modules/@types/psl && \
    printf 'declare module "psl";' > node_modules/@types/psl/index.d.ts

# 4. COMPILACIÓN QUIRÚRGICA DE SQLITE3
# Como usamos --ignore-scripts, el binario nativo no se generó.
# Localizamos la carpeta en el storage de pnpm y forzamos la compilación.
RUN SQLITE3_PATH=$(find node_modules/.pnpm -name "sqlite3" -type d | head -n 1) && \
    cd $SQLITE3_PATH && npm install --build-from-source

# 5. CONSTRUCCIÓN FINAL CON TURBO
# Turbo ahora encontrará tanto los tipos de PSL como el binario de SQLite
RUN pnpm build

# Comando por defecto (ajusta según tu despliegue en TACC/Render)
CMD ["pnpm", "start"]

# Run from root:
# sudo docker build -t n8n-tapis-auth:latest -f docker/images/n8n/Dockerfile .