variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run deployment"
  type        = string
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
}

variable "container_image" {
  description = "Container image URL"
  type        = string
}

variable "node_env" {
  description = "Node environment"
  type        = string
}

variable "db_type" {
  description = "Database type"
  type        = string
}

variable "db_host" {
  description = "Database host"
  type        = string
}

variable "db_port" {
  description = "Database port"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_user" {
  description = "Database user"
  type        = string
}

variable "db_password_secret_name" {
  description = "Name of the database password secret"
  type        = string
}

variable "encryption_key_secret_name" {
  description = "Name of the encryption key secret"
  type        = string
}

variable "cpu_limit" {
  description = "CPU limit for the container"
  type        = string
}

variable "memory_limit" {
  description = "Memory limit for the container"
  type        = string
}

variable "timeout_seconds" {
  description = "Timeout for Cloud Run service"
  type        = number
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = string
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = string
}

variable "allow_unauthenticated" {
  description = "Allow unauthenticated access to the service"
  type        = bool
}