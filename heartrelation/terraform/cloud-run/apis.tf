resource "google_project_service" "cloud_run_api" {
  project = var.project_id
  service = "run.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "secret_manager_api" {
  project = var.project_id
  service = "secretmanager.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry_api" {
  project = var.project_id
  service = "artifactregistry.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "sql_admin_api" {
  project = var.project_id
  service = "sqladmin.googleapis.com"

  disable_on_destroy = false
}