#!/usr/bin/env bash
#
# Script para desplegar n8n-rankia (fork) en Google Cloud Run
# Configurado para usar Google Cloud Storage para almacenamiento binario
#

# Uso estricto de bash:
# - Salir inmediatamente si un comando falla
# - Considerar como error si una variable no definida es utilizada
# - Salir si cualquier comando en una tubería falla
set -euo pipefail
IFS=$'\n\t'

# --- Funciones de Utilidad para mejor output ---
echo_step() {
  echo -e "\n\033[1;34m=== $1 ===\033[0m\n"
}

echo_info() {
  echo -e "\033[0;32mINFO:\033[0m $1"
}

echo_warning() {
  echo -e "\033[0;33mWARN:\033[0m $1"
}

echo_error() {
  echo -e "\033[0;31mERROR:\033[0m $1" >&2
}

# --- Variables de Configuración ---
# Puedes ajustar estas variables si cambian en el futuro.
declare -r GCP_PROJECT_ID="varhall"
declare -r GCP_REGION="europe-west1"
declare -r CLOUD_RUN_SERVICE_NAME="n8n-rankia"
declare -r DOCKER_IMAGE_NAME="gcr.io/${GCP_PROJECT_ID}/${CLOUD_RUN_SERVICE_NAME}:latest" # Asume 'latest' tag

declare -r DB_INSTANCE_NAME="n8n-rankia-db" # Nombre de tu instancia de Cloud SQL
declare -r REDIS_INSTANCE_NAME="n8n-rankia-redis" # Nombre de tu instancia de Memorystore for Redis

# Configuraciones personalizadas de n8n
declare -r N8N_CUSTOM_NAME="Rankia Automarketing"
declare -r N8N_CUSTOM_EMAIL="automarketing@rankia.com"

# Configuración del bucket de almacenamiento
declare -r GCS_BUCKET_NAME="n8n-rankia-binary-data" # El bucket debe existir previamente

# --- Obtener Secretos de Secret Manager ---
echo_info "Obteniendo secretos de Secret Manager..."
# IMPORTANTE: Estos secretos deben existir en Secret Manager
# Usar: gcloud secrets create SECRET_NAME --replication-policy="automatic"
# para crear los secretos necesarios si no existen
declare DB_PASSWORD
DB_PASSWORD=$(gcloud secrets versions access latest --secret="n8n-rankia-db-password" --project="${GCP_PROJECT_ID}")

declare N8N_ENCRYPTION_KEY
N8N_ENCRYPTION_KEY=$(gcloud secrets versions access latest --secret="n8n-rankia-encryption-key" --project="${GCP_PROJECT_ID}")

if [[ -z "${DB_PASSWORD}" ]]; then
  echo_error "No se pudo obtener DB_PASSWORD de Secret Manager."
  exit 1
fi

if [[ -z "${N8N_ENCRYPTION_KEY}" ]]; then
  echo_error "No se pudo obtener N8N_ENCRYPTION_KEY de Secret Manager."
  exit 1
fi

echo_info "Secretos obtenidos correctamente."

# --- Inicio del Script ---
echo_step "Iniciando despliegue de ${CLOUD_RUN_SERVICE_NAME} a Cloud Run"
echo_info "Proyecto GCP: ${GCP_PROJECT_ID}"
echo_info "Región GCP: ${GCP_REGION}"
echo_info "Imagen Docker: ${DOCKER_IMAGE_NAME}"

# --- Paso 1: Construir la imagen Docker (si es necesario) ---
# Descomenta la siguiente sección si quieres que el script también construya la imagen.
# Asegúrate de estar en el directorio raíz del proyecto n8n-rankia (donde está el Dockerfile).
# echo_step "Construyendo imagen Docker con Cloud Build"
# gcloud builds submit --tag "${DOCKER_IMAGE_NAME}" --project="${GCP_PROJECT_ID}"
# echo_info "Imagen construida y subida a ${DOCKER_IMAGE_NAME}"

# --- Paso 2: Obtener información de servicios dependientes ---
echo_step "Obteniendo información de Redis y Cloud SQL"

declare REDIS_HOST
REDIS_HOST=$(gcloud redis instances describe "${REDIS_INSTANCE_NAME}" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --format='value(host)')
echo_info "Host de Redis obtenido: ${REDIS_HOST}"

# Obtenemos el nombre de conexión de la instancia SQL para usarlo con --add-cloudsql-instances
# pero NO para la variable de entorno DB_POSTGRESDB_HOST (esa se construye manualmente con el formato correcto)
declare INSTANCE_CONNECTION_NAME
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe "${DB_INSTANCE_NAME}" \
  --project="${GCP_PROJECT_ID}" \
  --format='value(connectionName)')
echo_info "Nombre de conexión SQL obtenido: ${INSTANCE_CONNECTION_NAME}"

# --- Paso 3: Desplegar en Cloud Run ---
echo_step "Desplegando servicio en Cloud Run"

# Construir la cadena de variables de entorno
# (Se usa un array para mejor legibilidad y manejo de comas)
declare -a ENV_VARS_ARRAY=(
  "DB_TYPE=postgresdb"
  "DB_POSTGRESDB_HOST=/cloudsql/${GCP_PROJECT_ID}:${GCP_REGION}:${DB_INSTANCE_NAME}"
  "DB_POSTGRESDB_DATABASE=n8n"
  "DB_POSTGRESDB_USER=n8n"
  "DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}"
  "REDIS_HOST=${REDIS_HOST}"
  "N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}"
  "N8N_CUSTOM_API_CALL_NAME=${N8N_CUSTOM_NAME}"
  "N8N_CUSTOM_API_CALL_EMAIL=${N8N_CUSTOM_EMAIL}"
  "N8N_BASIC_AUTH_ACTIVE=true"
  "N8N_SECURE_COOKIE=false" # Ajustar si usas HTTPS directamente en Cloud Run con dominio mapeado
  "N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true"
  "N8N_HOST=auto.rankia.com"
  "N8N_PROTOCOL=https"
  "WEBHOOK_URL=https://auto.rankia.com/"
  "TZ=Europe/Madrid" # Timezone
  "NODE_ENV=production"
  # --- Configuración de Google Cloud Storage para Datos Binarios ---
  "N8N_BINARY_DATA_STORAGE_TYPE=googleCloudStorage"
  "N8N_BINARY_DATA_STORAGE_GOOGLE_CLOUD_STORAGE_BUCKET_NAME=${GCS_BUCKET_NAME}"
  "N8N_BINARY_DATA_STORAGE_GOOGLE_CLOUD_STORAGE_PATH_PREFIX=n8n_binary_data/" # Prefijo opcional para organizar dentro del bucket
  # Añade más variables de entorno aquí si es necesario, separadas por coma en la cadena final
)

# Unir el array en una cadena separada por comas
declare ENV_VARS_STRING
ENV_VARS_STRING=$(IFS=,; echo "${ENV_VARS_ARRAY[*]}")

# Ejecutar el despliegue con gcloud run
gcloud run deploy "${CLOUD_RUN_SERVICE_NAME}" \
  --image "${DOCKER_IMAGE_NAME}" \
  --platform "managed" \
  --region "${GCP_REGION}" \
  --allow-unauthenticated \
  --set-env-vars="${ENV_VARS_STRING}" \
  --add-cloudsql-instances "${INSTANCE_CONNECTION_NAME}" \
  --memory "1Gi" \
  --cpu "1" \
  --min-instances "0" \
  --port "8080" \
  --concurrency "80" \
  --project="${GCP_PROJECT_ID}"

# Obtener la URL del servicio desplegado
declare SERVICE_URL
SERVICE_URL=$(gcloud run services describe "${CLOUD_RUN_SERVICE_NAME}" \
  --platform managed \
  --region "${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --format='value(status.url)')

echo_step "¡Despliegue completado!"
echo_info "El servicio ${CLOUD_RUN_SERVICE_NAME} está disponible en: ${SERVICE_URL}"

# --- Fin del Script ---