# Data sources for existing Secret Manager secrets
# These secrets should be created manually before running Terraform

data "google_secret_manager_secret_version" "db_password" {
  secret = var.db_password_secret_name
}

data "google_secret_manager_secret_version" "n8n_encryption_key" {
  secret = var.n8n_encryption_key_secret_name
}