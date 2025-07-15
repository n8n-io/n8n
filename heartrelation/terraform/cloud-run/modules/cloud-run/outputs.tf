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