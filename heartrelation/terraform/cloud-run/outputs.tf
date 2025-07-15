output "service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_service.n8n.status[0].url
}

output "service_name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_service.n8n.name
}

output "service_location" {
  description = "Location of the Cloud Run service"
  value       = google_cloud_run_service.n8n.location
}

output "service_account_email" {
  description = "Email of the service account used by Cloud Run"
  value       = google_service_account.n8n.email
}

output "db_password_secret_name" {
  description = "Name of the database password secret in Secret Manager"
  value       = google_secret_manager_secret.db_password.secret_id
}

output "encryption_key_secret_name" {
  description = "Name of the encryption key secret in Secret Manager"
  value       = google_secret_manager_secret.encryption_key.secret_id
}