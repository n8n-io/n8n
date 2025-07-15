# Production Environment Configuration
project_id = "n8n-prd-466015"
region     = "asia-northeast1"

# Cloud Run Service Configuration
service_name     = "n8n-prd"
container_image  = "asia-northeast1-docker.pkg.dev/n8n-prd-466015/n8n-images/n8n:latest"
node_env         = "production"

# Database Configuration
db_type     = "postgres"
db_name     = "n8n"
db_user     = "n8n"

# Secret Manager Configuration
db_password_secret_name        = "n8n-prd-db-password"
n8n_encryption_key_secret_name = "n8n-prd-encryption-key"
manage_secret_versions         = false

# Resource Limits (production sized)
cpu_limit      = "4"
memory_limit   = "4Gi"
timeout_seconds = 3600

# Scaling Configuration (production sized)
max_instances = "20"
min_instances = "2"

# Access Control
allow_unauthenticated = false

# Artifact Registry Configuration
artifact_registry_location   = "asia-northeast1"
artifact_registry_repository = "n8n-images"

# PostgreSQL Configuration (production sized)
postgres_instance_name       = "n8n-postgres-prd"
postgres_database_version    = "POSTGRES_15"
postgres_tier               = "db-n1-standard-2"
postgres_availability_type  = "REGIONAL"
postgres_disk_size          = 100
postgres_disk_type          = "PD_SSD"
postgres_deletion_protection = true
postgres_backup_enabled     = true
postgres_authorized_networks = [
  {
    name  = "all"
    value = "0.0.0.0/0"
  }
]