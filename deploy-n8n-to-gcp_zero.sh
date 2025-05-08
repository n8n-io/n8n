#!/bin/bash
# Script para desplegar n8n en Google Cloud Platform
# Creado para Rankia

set -e  # Detener si hay errores

# Comprobar si existe el archivo .env
if [ ! -f ".env" ]; then
  echo "❌ Error: Archivo .env no encontrado. Por favor, crea el archivo .env primero."
  echo "Puedes usar como base el archivo rankia-n8n.env proporcionado."
  exit 1
fi

# Cargar variables de entorno desde .env
source .env

# Funciones de utilidad
echo_step() {
  echo -e "\n\033[1;36m==== $1 ====\033[0m\n"
}

echo_success() {
  echo -e "\n\033[1;32m✅ $1\033[0m\n"
}

echo_warning() {
  echo -e "\n\033[1;33m⚠️ $1\033[0m\n"
}

# Mostrar bienvenida
echo_step "🚀 Iniciando despliegue de n8n Rankia en Google Cloud Platform"
echo "- Proyecto: $PROJECT_ID"
echo "- Región: $REGION"
echo "- Dominio: $DOMAIN"

# Verificar que las variables críticas están definidas
if [[ -z "$N8N_PASSWORD" || -z "$DB_PASSWORD" || -z "$N8N_ENCRYPTION_KEY" ]]; then
  echo "❌ Error: Faltan variables críticas en .env (contraseñas o clave de encriptación)"
  exit 1
fi

if [[ ${#N8N_ENCRYPTION_KEY} -ne 32 ]]; then
  echo "❌ Error: N8N_ENCRYPTION_KEY debe tener exactamente 32 caracteres. Actual: ${#N8N_ENCRYPTION_KEY}"
  exit 1
fi

# Confirmar inicio
read -p "¿Continuar con el despliegue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Despliegue cancelado."
    exit 1
fi

# Paso 1: Habilitar APIs necesarias
echo_step "Habilitando APIs necesarias"
gcloud services enable cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com

# Paso 2: Crear base de datos PostgreSQL
echo_step "Creando instancia de Cloud SQL (PostgreSQL)"
echo_warning "Este paso puede tardar hasta 10 minutos..."
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_14 \
  --tier=db-g1-small \
  --region=$REGION \
  --storage-size=10GB \
  --availability-type=zonal \
  --storage-type=SSD \
  --backup-start-time=02:00 \
  --root-password=$DB_PASSWORD

# Paso 3: Crear usuario y base de datos
echo_step "Configurando usuario y base de datos"
gcloud sql users create $DB_POSTGRESDB_USER --instance=$DB_INSTANCE_NAME --password=$DB_PASSWORD
gcloud sql databases create $DB_POSTGRESDB_DATABASE --instance=$DB_INSTANCE_NAME

# Paso 4: Crear instancia Redis
echo_step "Creando instancia de Redis"
echo_warning "Este paso puede tardar hasta 5 minutos..."
gcloud redis instances create $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --zone=$ZONE \
  --size=1 \
  --redis-version=redis_6_x

# Obtener IP de Redis para la configuración
REDIS_IP=$(gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION --format='value(host)')
echo "IP de Redis: $REDIS_IP"

# Paso 5: Crear Dockerfile si no existe
echo_step "Verificando Dockerfile"
if [ ! -f "Dockerfile" ]; then
  echo "Creando Dockerfile..."
  cat > Dockerfile << 'EOF'
FROM node:16-alpine

# Instalar dependencias del sistema
RUN apk add --update graphicsmagick tzdata git

# Configurar timezone
ENV TZ=Europe/Madrid

# Directorio de trabajo
WORKDIR /app

# Copiar el código
COPY . .

# Instalar dependencias y construir
RUN npm install
RUN npm run build

# Exponer puerto
EXPOSE 5678

# Iniciar n8n
CMD ["npm", "run", "start"]
EOF
fi

# Paso 6: Obtener la conexión de Cloud SQL
echo_step "Obteniendo información de conexión a la base de datos"
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format='value(connectionName)')
echo "Connection Name: $INSTANCE_CONNECTION_NAME"

# Paso 7: Construir imagen con Cloud Build
echo_step "Construyendo imagen de Docker con Cloud Build"
echo_warning "Este paso puede tardar varios minutos dependiendo del tamaño del código..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$N8N_SERVICE_NAME

# Paso 8: Desplegar en Cloud Run
echo_step "Desplegando en Cloud Run"
gcloud run deploy $N8N_SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$N8N_SERVICE_NAME \
  --platform managed \
  --region=$REGION \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,\
GENERIC_TIMEZONE=$GENERIC_TIMEZONE,\
N8N_BASIC_AUTH_ACTIVE=$N8N_BASIC_AUTH_ACTIVE,\
N8N_BASIC_AUTH_USER=$N8N_BASIC_AUTH_USER,\
N8N_BASIC_AUTH_PASSWORD=$N8N_PASSWORD,\
DB_TYPE=$DB_TYPE,\
DB_POSTGRESDB_HOST=/cloudsql/$INSTANCE_CONNECTION_NAME,\
DB_POSTGRESDB_DATABASE=$DB_POSTGRESDB_DATABASE,\
DB_POSTGRESDB_USER=$DB_POSTGRESDB_USER,\
DB_POSTGRESDB_PASSWORD=$DB_PASSWORD,\
REDIS_HOST=$REDIS_IP,\
N8N_ENCRYPTION_KEY=$N8N_ENCRYPTION_KEY,\
N8N_SECURE_COOKIE=$N8N_SECURE_COOKIE,\
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=$N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE,\
N8N_CUSTOM_API_CALL_NAME=$N8N_CUSTOM_API_CALL_NAME,\
N8N_CUSTOM_API_CALL_EMAIL=$N8N_CUSTOM_API_CALL_EMAIL" \
  --add-cloudsql-instances $INSTANCE_CONNECTION_NAME \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1

# Paso 9: Mapear dominio personalizado
echo_step "Configurando dominio personalizado"
gcloud beta run domain-mappings create \
  --service $N8N_SERVICE_NAME \
  --domain $DOMAIN \
  --region=$REGION

# Obtener la URL del servicio
SERVICE_URL=$(gcloud run services describe $N8N_SERVICE_NAME \
  --platform managed \
  --region=$REGION \
  --format='value(status.url)')

echo_success "¡Despliegue completado!"
echo -e "\nTu servicio n8n está disponible en:"
echo "- URL generada: $SERVICE_URL"
echo "- URL personalizada (pendiente de verificación DNS): https://$DOMAIN"
echo -e "\nSigue las instrucciones de Google Cloud para verificar tu dominio y configurar los registros DNS en Cloudflare." 