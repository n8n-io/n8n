variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run deployment"
  type        = string
  default     = "asia-northeast1"
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  default     = "n8n"
}

variable "container_image" {
  description = "Container image URL (e.g., gcr.io/PROJECT_ID/n8n:latest)"
  type        = string
}

variable "node_env" {
  description = "Node environment"
  type        = string
  default     = "production"
}

variable "db_type" {
  description = "Database type (postgres, mysql, sqlite)"
  type        = string
  default     = "postgres"
}

# Database configuration is now handled by the postgres module
# db_host and db_port are automatically configured from the postgres module

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "n8n"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "n8n"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "n8n_encryption_key" {
  description = "N8N encryption key for credentials"
  type        = string
  sensitive   = true
}

variable "cpu_limit" {
  description = "CPU limit for the container"
  type        = string
  default     = "2"
}

variable "memory_limit" {
  description = "Memory limit for the container"
  type        = string
  default     = "2Gi"
}

variable "timeout_seconds" {
  description = "Timeout for Cloud Run service"
  type        = number
  default     = 3600
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = string
  default     = "10"
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = string
  default     = "1"
}

variable "allow_unauthenticated" {
  description = "Allow unauthenticated access to the service"
  type        = bool
  default     = false
}

variable "artifact_registry_location" {
  description = "Location for Artifact Registry repository"
  type        = string
  default     = "asia-northeast1"
}

variable "artifact_registry_repository" {
  description = "Name of the Artifact Registry repository"
  type        = string
  default     = "n8n-images"
}

# PostgreSQL Configuration
variable "postgres_instance_name" {
  description = "Name of the Cloud SQL instance"
  type        = string
  default     = "n8n-postgres"
}

variable "postgres_database_version" {
  description = "PostgreSQL database version"
  type        = string
  default     = "POSTGRES_15"
}

variable "postgres_tier" {
  description = "Machine type for the Cloud SQL instance"
  type        = string
  default     = "db-f1-micro"
}

variable "postgres_availability_type" {
  description = "Availability type for the Cloud SQL instance"
  type        = string
  default     = "ZONAL"
}

variable "postgres_disk_size" {
  description = "Disk size in GB for PostgreSQL"
  type        = number
  default     = 20
}

variable "postgres_disk_type" {
  description = "Disk type for PostgreSQL"
  type        = string
  default     = "PD_SSD"
}

variable "postgres_deletion_protection" {
  description = "Enable deletion protection for PostgreSQL"
  type        = bool
  default     = true
}

variable "postgres_backup_enabled" {
  description = "Enable automated backups for PostgreSQL"
  type        = bool
  default     = true
}

variable "postgres_authorized_networks" {
  description = "List of authorized networks for PostgreSQL"
  type = list(object({
    name  = string
    value = string
  }))
  default = [
    {
      name  = "all"
      value = "0.0.0.0/0"
    }
  ]
}