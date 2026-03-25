
# 1. Usamos Node 20 (LTS) - Importante para estabilidad en TACC
FROM node:24-bookworm AS builder

WORKDIR /app

# 2. Instalamos herramientas de compilación necesarias
RUN apt-get update && apt-get install -y build-essential python3 && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

# 3. Copiamos el código
COPY . .

# 4. CONFIGURACIÓN CRUCIAL:
# Saltamos los scripts de 'prepare' (Lefthook/Git) 
# pero NO usamos --ignore-scripts para que esbuild y otros se instalen bien.
ENV PNPM_SKIP_PREPARE=1

RUN pnpm install --no-frozen-lockfile --ignore-scripts

# 5. Forzamos la descarga del binario de esbuild para Linux 64 bits
# Esto soluciona el error 2 en los paquetes de codemirror
RUN pnpm add -Dw esbuild --ignore-scripts

# 6. Compilamos manualmente los módulos de C++
RUN pnpm rebuild isolated-vm sqlite3

# 7. BUILD FINAL
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm build

# --- ETAPA FINAL ---
FROM node:20-bookworm-slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5678
CMD ["node", "packages/cli/bin/n8n"]