# Secret Manager secrets for referencing existing secrets
# These secrets should be created manually before running Terraform

# Reference existing database password secret
resource "google_secret_manager_secret" "db_password" {
  secret_id = var.db_password_secret_name

  replication {
    auto {}
  }

  # This will import existing secret if it exists
  lifecycle {
    prevent_destroy = true
  }
}

# Create secret version only if we're managing the secret value
# This is optional and can be omitted if secret is managed externally
resource "google_secret_manager_secret_version" "db_password" {
  count = var.manage_secret_versions ? 1 : 0
  
  secret      = google_secret_manager_secret.db_password.id
  secret_data = data.google_secret_manager_secret_version.db_password.secret_data

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Reference existing encryption key secret
resource "google_secret_manager_secret" "encryption_key" {
  secret_id = var.n8n_encryption_key_secret_name

  replication {
    auto {}
  }

  # This will import existing secret if it exists
  lifecycle {
    prevent_destroy = true
  }
}

# Create secret version only if we're managing the secret value
# This is optional and can be omitted if secret is managed externally
resource "google_secret_manager_secret_version" "encryption_key" {
  count = var.manage_secret_versions ? 1 : 0
  
  secret      = google_secret_manager_secret.encryption_key.id
  secret_data = data.google_secret_manager_secret_version.n8n_encryption_key.secret_data

  lifecycle {
    ignore_changes = [secret_data]
  }
}