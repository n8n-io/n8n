variable "location" {
  description = "Location for Artifact Registry repository"
  type        = string
}

variable "repository_id" {
  description = "ID of the Artifact Registry repository"
  type        = string
}

variable "description" {
  description = "Description of the Artifact Registry repository"
  type        = string
  default     = "Docker repository for container images"
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}