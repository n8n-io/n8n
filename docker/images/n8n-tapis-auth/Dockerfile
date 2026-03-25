
# Usamos Node 20 LTS (Bookworm es clave para compatibilidad)
FROM node:24-bookworm AS builder

WORKDIR /app

# 1. Herramientas de compilación para módulos nativos
RUN apt-get update && apt-get install -y build-essential python3 && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

COPY . .

# 2. LA CLAVE: Usamos esta variable de entorno de pnpm para saltar 
# los scripts de 'prepare' y 'postinstall' (donde vive Lefthook y Git),
# pero permitiendo que se instalen TODAS las dependencias (incluyendo prettier).
ENV PNPM_SKIP_PREPARE=1

# Instalamos sin ignorar scripts de dependencias individuales, 
# pero saltando los scripts del proyecto raíz.
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# 3. Compilamos manualmente lo que n8n necesita para el nodo de Code
RUN pnpm rebuild isolated-vm sqlite3

# 4. BUILD: Con memoria suficiente para el compilador de TS
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm add -Dw esbuild --ignore-scripts
RUN pnpm build

# --- ETAPA FINAL (Imagen ligera) ---
FROM node:20-bookworm-slim
WORKDIR /app

# Copiamos el resultado del build
COPY --from=builder /app .

EXPOSE 5678

# Ejecución
CMD ["node", "packages/cli/bin/n8n"]