FROM node:22-bookworm AS builder

WORKDIR /app

# 1. Herramientas de sistema
RUN apt-get update && apt-get install -y build-essential python3 git && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

COPY . .

# 2. EL FIX CRUCIAL: Anulamos los scripts que buscan Git
# En lugar de borrarlos del JSON, los sobrescribimos con comandos que no hacen nada.
# Esto evita que 'pnpm install' falle al intentar inicializar hooks de Git inexistentes.
RUN pnpm config set side-effects-cache false && \
    pnpm config set shell-emulator true

# Sobrescribimos el script de prepare para que sea un éxito instantáneo
RUN npm pkg set scripts.prepare="echo 'Bypassing prepare script'"

# 3. Instalación (Ahora sí pasará el prepare)
ENV PNPM_SKIP_PREPARE=1
RUN pnpm install --no-frozen-lockfile

# 4. Forzamos arquitectura de esbuild
RUN pnpm add -Dw @esbuild/linux-x64

# 5. Compilamos módulos nativos
RUN pnpm rebuild isolated-vm sqlite3

# 6. BUILD FINAL
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm build

# --- ETAPA FINAL ---
FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5678
ENV HOME=/tmp
CMD ["node", "packages/cli/bin/n8n"]