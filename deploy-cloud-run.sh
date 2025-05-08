#!/bin/bash
# Script para desplegar n8n en Google Cloud Run
# Para Rankia Automarketing

set -e  # Detener si hay errores

# Variables de configuración
PROJECT_ID="varhall"
REGION="europe-west1"
N8N_SERVICE_NAME="n8n-rankia"
DB_INSTANCE_NAME="n8n-rankia-db"
REDIS_INSTANCE_NAME="n8n-rankia-redis"
DOMAIN="automarketing.rankia.com"

# Colores para output
BLUE='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funciones de utilidad
echo_step() {
  echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

echo_success() {
  echo -e "\n${GREEN}✅ $1${NC}\n"
}

echo_warning() {
  echo -e "\n${YELLOW}⚠️ $1${NC}\n"
}

# Mostrar bienvenida
echo_step "🚀 Desplegando n8n Rankia en Google Cloud Run"
echo "- Proyecto: $PROJECT_ID"
echo "- Región: $REGION"
echo "- Dominio: $DOMAIN"

# Confirmar inicio
read -p "¿Continuar con el despliegue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Despliegue cancelado."
    exit 1
fi

# Obtener IP de Redis para la configuración
echo_step "Obteniendo información de Redis"
REDIS_IP=$(gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION --format='value(host)')
echo "IP de Redis: $REDIS_IP"

# Obtener la conexión de Cloud SQL
echo_step "Obteniendo información de conexión a la base de datos"
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format='value(connectionName)')
echo "Connection Name: $INSTANCE_CONNECTION_NAME"

# Construir imagen con Cloud Build
echo_step "Construyendo imagen de Docker con Cloud Build"
echo_warning "Este paso puede tardar varios minutos dependiendo del tamaño del código..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$N8N_SERVICE_NAME

# Desplegar en Cloud Run
echo_step "Desplegando en Cloud Run"
gcloud run deploy $N8N_SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$N8N_SERVICE_NAME \
  --platform managed \
  --region=$REGION \
  --allow-unauthenticated \
  --set-env-vars="DB_TYPE=postgresdb,\
DB_POSTGRESDB_HOST=/cloudsql/$INSTANCE_CONNECTION_NAME,\
DB_POSTGRESDB_DATABASE=n8n,\
DB_POSTGRESDB_USER=n8n,\
DB_POSTGRESDB_PASSWORD=P0stgr3SQL!2024RankiaSecure,\
REDIS_HOST=$REDIS_IP,\
N8N_ENCRYPTION_KEY=Rankia2024AutoMarketingKey-n8n32,\
PORT=8080,\
N8N_PORT=8080" \
  --add-cloudsql-instances $INSTANCE_CONNECTION_NAME \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --port 8080 \
  --concurrency 80

# Mapear dominio personalizado
echo_step "Configurando dominio personalizado"
gcloud beta run domain-mappings create \
  --service $N8N_SERVICE_NAME \
  --domain $DOMAIN \
  --region=$REGION || echo "Dominio ya mapeado o error al mapear - continuando..."

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