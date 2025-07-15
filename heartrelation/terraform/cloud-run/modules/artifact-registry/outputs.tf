output "repository_name" {
  description = "Name of the Artifact Registry repository"
  value       = google_artifact_registry_repository.n8n_images.name
}

output "repository_id" {
  description = "ID of the Artifact Registry repository"
  value       = google_artifact_registry_repository.n8n_images.repository_id
}

output "location" {
  description = "Location of the Artifact Registry repository"
  value       = google_artifact_registry_repository.n8n_images.location
}

output "repository_url" {
  description = "URL of the Artifact Registry repository"
  value       = "${var.location}-docker.pkg.dev/${var.project_id}/${var.repository_id}"
}