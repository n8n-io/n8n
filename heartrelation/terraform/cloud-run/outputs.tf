# Cloud Run outputs
output "service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = module.cloud_run.service_url
}

output "service_name" {
  description = "Name of the Cloud Run service"
  value       = module.cloud_run.service_name
}

output "service_location" {
  description = "Location of the Cloud Run service"
  value       = module.cloud_run.service_location
}

output "service_account_email" {
  description = "Email of the service account used by Cloud Run"
  value       = module.cloud_run.service_account_email
}

# Secret Manager outputs
output "db_password_secret_name" {
  description = "Name of the database password secret in Secret Manager"
  value       = google_secret_manager_secret.db_password.secret_id
}

output "encryption_key_secret_name" {
  description = "Name of the encryption key secret in Secret Manager"
  value       = google_secret_manager_secret.encryption_key.secret_id
}

# Artifact Registry outputs
output "artifact_registry_repository_name" {
  description = "Name of the Artifact Registry repository"
  value       = module.artifact_registry.repository_name
}

output "artifact_registry_repository_id" {
  description = "ID of the Artifact Registry repository"
  value       = module.artifact_registry.repository_id
}

output "artifact_registry_location" {
  description = "Location of the Artifact Registry repository"
  value       = module.artifact_registry.location
}

output "artifact_registry_repository_url" {
  description = "URL of the Artifact Registry repository"
  value       = module.artifact_registry.repository_url
}

output "container_image_url" {
  description = "Full container image URL for the Artifact Registry"
  value       = "${module.artifact_registry.repository_url}/n8n:latest"
}

# PostgreSQL outputs
output "postgres_instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = module.postgres.instance_name
}

output "postgres_connection_name" {
  description = "Connection name of the Cloud SQL instance"
  value       = module.postgres.instance_connection_name
}

output "postgres_ip_address" {
  description = "IP address of the Cloud SQL instance"
  value       = module.postgres.instance_ip_address
}

output "postgres_database_name" {
  description = "Name of the PostgreSQL database"
  value       = module.postgres.database_name
}

output "postgres_database_user" {
  description = "PostgreSQL database user name"
  value       = module.postgres.database_user
}

output "postgres_host" {
  description = "PostgreSQL host (IP address)"
  value       = module.postgres.database_host
}

output "postgres_port" {
  description = "PostgreSQL port"
  value       = module.postgres.database_port
}