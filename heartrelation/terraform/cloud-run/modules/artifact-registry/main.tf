resource "google_artifact_registry_repository" "n8n_images" {
  location      = var.location
  repository_id = var.repository_id
  description   = var.description
  format        = "DOCKER"
}