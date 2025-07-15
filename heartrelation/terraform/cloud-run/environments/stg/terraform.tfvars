# Staging Environment Configuration
project_id = "n8n-stg-466014"
region     = "asia-northeast1"

# Cloud Run Service Configuration
service_name     = "n8n-stg"
container_image  = "asia-northeast1-docker.pkg.dev/n8n-stg-466014/n8n-images/n8n:latest"
node_env         = "staging"

# Database Configuration
db_type     = "postgres"
db_name     = "n8n"
db_user     = "n8n"
db_password = "CHANGE_ME_SECURE_PASSWORD_STG"

# N8N Configuration
n8n_encryption_key = "CHANGE_ME_32_CHARACTER_ENCRYPTION_KEY_STG"

# Resource Limits (smaller for staging)
cpu_limit      = "1"
memory_limit   = "1Gi"
timeout_seconds = 3600

# Scaling Configuration (smaller for staging)
max_instances = "3"
min_instances = "0"

# Access Control
allow_unauthenticated = false

# Artifact Registry Configuration
artifact_registry_location   = "asia-northeast1"
artifact_registry_repository = "n8n-images"

# PostgreSQL Configuration (smaller for staging)
postgres_instance_name       = "n8n-postgres-stg"
postgres_database_version    = "POSTGRES_15"
postgres_tier               = "db-f1-micro"
postgres_availability_type  = "ZONAL"
postgres_disk_size          = 10
postgres_disk_type          = "PD_SSD"
postgres_deletion_protection = false
postgres_backup_enabled     = true
postgres_authorized_networks = [
  {
    name  = "all"
    value = "0.0.0.0/0"
  }
]