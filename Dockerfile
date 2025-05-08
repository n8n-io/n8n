    # === STAGE 1: BUILD FROM SOURCE ===
    FROM node:20-alpine AS builder
    WORKDIR /build

    # Instalar herramientas de build (git es necesario para pnpm a veces, python/make/g++ para native modules)
    RUN apk add --no-cache git python3 make g++

    # Instalar pnpm (ajusta la versión si tu fork requiere una específica diferente a 10.2.1)
    RUN npm install -g pnpm@10.2.1

    # Copiar archivos de manifiesto, lockfile y configuración de pnpm.
    # Copia también la carpeta 'patches' si tu fork usa 'pnpm patch'.
    COPY package.json pnpm-lock.yaml .npmrc ./
    COPY patches ./patches/

    # Copiar todo el código fuente de tu fork al directorio de build.
    COPY . .

    # Instalar dependencias.
    # LEFTHOOK=0: Desactiva lefthook para evitar errores en el entorno de build donde los git hooks no son relevantes.
    # --frozen-lockfile: Asegura que se usen las versiones exactas especificadas en pnpm-lock.yaml.
    ENV DOCKER_BUILD=true
    RUN LEFTHOOK=0 pnpm install --frozen-lockfile

    # Construir el proyecto.
    # Esto ejecutará el script 'build' definido en el package.json raíz de tu fork,
    # que usualmente orquesta la compilación de todos los paquetes del monorepo (e.g., usando Turborepo).
    ENV NODE_OPTIONS=--max-old-space-size=4096
    RUN pnpm run build

    # === STAGE 2: RUNTIME IMAGE ===
    FROM node:20-alpine
    LABEL maintainer="automarketing@rankia.com"

    # Configuración del entorno
    ENV TZ=Europe/Madrid
    ENV NODE_ENV=production
    ENV N8N_PORT=8080
    # n8n escuchará en este puerto dentro del contenedor
    ENV PORT=8080
    # Cloud Run expondrá este puerto

    # Crear usuario y directorio de trabajo no-root para mayor seguridad.
    RUN addgroup -S n8n && adduser -S n8n -G n8n
    WORKDIR /home/n8n

    # Copiar los artefactos de build necesarios desde la etapa 'builder'.
    COPY --chown=n8n:n8n --from=builder /build/packages ./packages
    COPY --chown=n8n:n8n --from=builder /build/node_modules ./node_modules

    # Copiar el script de inicio personalizado y darle permisos de ejecución.
    COPY --chown=n8n:n8n start.sh /home/n8n/start.sh
    RUN chmod +x /home/n8n/start.sh

    # Exponer el puerto en el que la aplicación escuchará.
    EXPOSE 8080

    # Cambiar al usuario no-root.
    USER n8n

    # Comando para iniciar la aplicación.
    CMD ["/home/n8n/start.sh"]