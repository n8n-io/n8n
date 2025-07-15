variable "instance_name" {
  description = "Name of the Cloud SQL instance"
  type        = string
}

variable "database_version" {
  description = "Database version"
  type        = string
  default     = "POSTGRES_15"
}

variable "region" {
  description = "Region for the Cloud SQL instance"
  type        = string
}

variable "tier" {
  description = "Machine type for the Cloud SQL instance"
  type        = string
  default     = "db-f1-micro"
}

variable "availability_type" {
  description = "Availability type for the Cloud SQL instance"
  type        = string
  default     = "ZONAL"
}

variable "disk_size" {
  description = "Disk size in GB"
  type        = number
  default     = 20
}

variable "disk_type" {
  description = "Disk type"
  type        = string
  default     = "PD_SSD"
}

variable "disk_autoresize" {
  description = "Enable disk autoresize"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_start_time" {
  description = "Backup start time in HH:MM format"
  type        = string
  default     = "03:00"
}

variable "point_in_time_recovery_enabled" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "ipv4_enabled" {
  description = "Enable IPv4"
  type        = bool
  default     = true
}

variable "private_network" {
  description = "Private network for the Cloud SQL instance"
  type        = string
  default     = null
}

variable "enable_private_path_for_google_cloud_services" {
  description = "Enable private path for Google Cloud services"
  type        = bool
  default     = false
}

variable "authorized_networks" {
  description = "List of authorized networks"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "maintenance_window_day" {
  description = "Day of week for maintenance window (1-7, 1=Monday)"
  type        = number
  default     = 7
}

variable "maintenance_window_hour" {
  description = "Hour of day for maintenance window (0-23)"
  type        = number
  default     = 3
}

variable "maintenance_window_update_track" {
  description = "Update track for maintenance window"
  type        = string
  default     = "stable"
}

variable "query_insights_enabled" {
  description = "Enable query insights"
  type        = bool
  default     = true
}

variable "query_string_length" {
  description = "Maximum query string length for insights"
  type        = number
  default     = 1024
}

variable "record_application_tags" {
  description = "Record application tags in query insights"
  type        = bool
  default     = false
}

variable "record_client_address" {
  description = "Record client address in query insights"
  type        = bool
  default     = false
}

variable "database_name" {
  description = "Name of the database"
  type        = string
}

variable "database_user" {
  description = "Database user name"
  type        = string
}

variable "database_password" {
  description = "Database user password"
  type        = string
  sensitive   = true
}