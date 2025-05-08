#!/bin/bash
# Script para desplegar n8n en Google Cloud Run
# Para Rankia Automarketing

set -e  # Detener si hay errores

# Variables de configuración (leídas desde el entorno, con defaults si no se proveen)
GCP_PROJECT_ID="${GCP_PROJECT_ID_ENV:-your-gcp-project-id}" # Será sobreescrito por secrets.GCP_PROJECT_ID en CI
GCP_REGION="${GCP_REGION_ENV:-europe-west1}"
N8N_SERVICE_NAME_VAR="${N8N_SERVICE_NAME_ENV:-n8n-rankia}"
DB_INSTANCE_NAME_VAR="${DB_INSTANCE_NAME_ENV:-n8n-rankia-db}"
REDIS_INSTANCE_NAME_VAR="${REDIS_INSTANCE_NAME_ENV:-n8n-rankia-redis}"
N8N_DOMAIN_VAR="${N8N_DOMAIN_ENV:-example.your-domain.com}"

# Secrets que deben ser pasados como variables de entorno en CI/CD
# Para ejecución local, necesitarías exportarlos en tu terminal
DB_NAME_VAR="${DB_NAME_ENV:-n8n}"
DB_USER_VAR="${DB_USER_ENV:-n8n_user}" # Cambiado para evitar confusión con el usuario n8n del Dockerfile
DB_PASSWORD_VAR="${DB_PASSWORD_ENV}" # NO PONER DEFAULT AQUI
N8N_ENCRYPTION_KEY_VAR="${N8N_ENCRYPTION_KEY_ENV}" # NO PONER DEFAULT AQUI
N8N_APP_PORT_VAR="${N8N_APP_PORT_ENV:-8080}"


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
  echo -e "\n${YELLOW}⚠️  $1${NC}\n"
}

# Validar que los secrets necesarios fueron pasados
if [ -z "$DB_PASSWORD_VAR" ]; then
  echo_warning "ERROR: La variable de entorno DB_PASSWORD_ENV no está seteada."
  exit 1
fi
if [ -z "$N8N_ENCRYPTION_KEY_VAR" ]; then
  echo_warning "ERROR: La variable de entorno N8N_ENCRYPTION_KEY_ENV no está seteada."
  exit 1
fi


# Mostrar bienvenida
echo_step "🚀 Desplegando n8n Rankia en Google Cloud Run"
echo "- Proyecto: $GCP_PROJECT_ID"
echo "- Región: $GCP_REGION"
echo "- Servicio n8n: $N8N_SERVICE_NAME_VAR"
echo "- Dominio: $N8N_DOMAIN_VAR"

# Ya no hay confirmación interactiva para CI/CD

# Obtener IP de Redis para la configuración
echo_step "Obteniendo información de Redis"
REDIS_IP=$(gcloud redis instances describe "$REDIS_INSTANCE_NAME_VAR" \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" --format='value(host)')
echo "IP de Redis: $REDIS_IP"

# Obtener la conexión de Cloud SQL
echo_step "Obteniendo información de conexión a la base de datos"
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe "$DB_INSTANCE_NAME_VAR" \
  --project="$GCP_PROJECT_ID" --format='value(connectionName)')
echo "Connection Name: $INSTANCE_CONNECTION_NAME"

# Construir imagen con Cloud Build
echo_step "Construyendo imagen de Docker con Cloud Build"
echo_warning "Este paso puede tardar varios minutos..."
# Usar github.sha o un timestamp para el tag de la imagen es una buena práctica en CI/CD
IMAGE_TAG="${IMAGE_TAG_ENV:-latest}" # En CI, IMAGE_TAG_ENV podría ser ${{ github.sha }}
IMAGE_NAME="gcr.io/$GCP_PROJECT_ID/$N8N_SERVICE_NAME_VAR:$IMAGE_TAG"
gcloud builds submit --project="$GCP_PROJECT_ID" --tag "$IMAGE_NAME"

# Desplegar en Cloud Run
echo_step "Desplegando en Cloud Run"
# Construir la cadena de --set-env-vars dinámicamente
ENV_VARS_STRING="DB_TYPE=postgresdb"
ENV_VARS_STRING+=",DB_POSTGRESDB_HOST=/cloudsql/$INSTANCE_CONNECTION_NAME"
ENV_VARS_STRING+=",DB_POSTGRESDB_DATABASE=$DB_NAME_VAR"
ENV_VARS_STRING+=",DB_POSTGRESDB_USER=$DB_USER_VAR"
ENV_VARS_STRING+=",DB_POSTGRESDB_PASSWORD=$DB_PASSWORD_VAR" # Usa la variable
ENV_VARS_STRING+=",REDIS_HOST=$REDIS_IP"
ENV_VARS_STRING+=",N8N_ENCRYPTION_KEY=$N8N_ENCRYPTION_KEY_VAR" # Usa la variable
ENV_VARS_STRING+=",PORT=$N8N_APP_PORT_VAR"
ENV_VARS_STRING+=",N8N_PORT=$N8N_APP_PORT_VAR"
# Añade otras variables de entorno que n8n pueda necesitar aquí

gcloud run deploy "$N8N_SERVICE_NAME_VAR" \
  --image "$IMAGE_NAME" \
  --platform managed \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" \
  --allow-unauthenticated \
  --set-env-vars="$ENV_VARS_STRING" \
  --add-cloudsql-instances "$INSTANCE_CONNECTION_NAME" \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --port "$N8N_APP_PORT_VAR" \
  --concurrency 80

# Mapear dominio personalizado
echo_step "Configurando dominio personalizado"
gcloud beta run domain-mappings create \
  --service "$N8N_SERVICE_NAME_VAR" \
  --domain "$N8N_DOMAIN_VAR" \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" || echo_warning "Dominio ya mapeado o error al mapear - continuando..."

# Obtener la URL del servicio
SERVICE_URL=$(gcloud run services describe "$N8N_SERVICE_NAME_VAR" \
  --platform managed \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" \
  --format='value(status.url)')

echo_success "¡Despliegue completado!"
echo -e "\nTu servicio n8n está disponible en:"
echo "- URL generada: $SERVICE_URL"
echo "- URL personalizada (pendiente de verificación DNS): https://$N8N_DOMAIN_VAR"
echo -e "\nSigue las instrucciones de Google Cloud para verificar tu dominio y configurar los registros DNS." 