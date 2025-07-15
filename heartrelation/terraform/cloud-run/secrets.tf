resource "google_secret_manager_secret" "db_password" {
  secret_id = "${var.service_name}-db-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

resource "google_secret_manager_secret" "encryption_key" {
  secret_id = "${var.service_name}-encryption-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "encryption_key" {
  secret      = google_secret_manager_secret.encryption_key.id
  secret_data = var.n8n_encryption_key
}