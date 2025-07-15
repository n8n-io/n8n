# N8N Cloud Run Deployment
# This configuration deploys n8n on Google Cloud Run with supporting infrastructure

# Local values for common configurations
locals {
  common_labels = {
    application = "n8n"
    environment = var.node_env
    managed_by  = "terraform"
  }
}

# Artifact Registry module
module "artifact_registry" {
  source = "./modules/artifact-registry"

  project_id    = var.project_id
  location      = var.artifact_registry_location
  repository_id = var.artifact_registry_repository
  description   = "Docker repository for n8n images"

  depends_on = [google_project_service.artifact_registry_api]
}

# PostgreSQL module
module "postgres" {
  source = "./modules/postgres"

  instance_name       = var.postgres_instance_name
  database_version    = var.postgres_database_version
  region              = var.region
  tier                = var.postgres_tier
  availability_type   = var.postgres_availability_type
  disk_size           = var.postgres_disk_size
  disk_type           = var.postgres_disk_type
  deletion_protection = var.postgres_deletion_protection
  backup_enabled      = var.postgres_backup_enabled
  authorized_networks = var.postgres_authorized_networks
  database_name       = var.db_name
  database_user       = var.db_user
  database_password   = var.db_password

  depends_on = [google_project_service.sql_admin_api]
}

# Cloud Run module
module "cloud_run" {
  source = "./modules/cloud-run"

  project_id                 = var.project_id
  region                     = var.region
  service_name               = var.service_name
  container_image            = var.container_image
  node_env                   = var.node_env
  db_type                    = var.db_type
  db_host                    = module.postgres.database_host
  db_port                    = module.postgres.database_port
  db_name                    = module.postgres.database_name
  db_user                    = module.postgres.database_user
  db_password_secret_name    = google_secret_manager_secret.db_password.secret_id
  encryption_key_secret_name = google_secret_manager_secret.encryption_key.secret_id
  cpu_limit                  = var.cpu_limit
  memory_limit               = var.memory_limit
  timeout_seconds            = var.timeout_seconds
  max_instances              = var.max_instances
  min_instances              = var.min_instances
  allow_unauthenticated      = var.allow_unauthenticated

  depends_on = [
    google_project_service.cloud_run_api,
    google_secret_manager_secret_version.db_password,
    google_secret_manager_secret_version.encryption_key
  ]
}