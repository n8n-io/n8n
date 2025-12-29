# main.tf - The "Elite" Runtime
# Deploys N8N on Cloud Run with Sidecar Gemini Integration
resource "google_cloud_run_v2_service" "n8n_elite" {
  name     = "n8n-omni-runtime"
  location = "us-central1"

  template {
    containers {
      image = "docker.io/n8nio/n8n:latest"
      resources {
        limits = {
          cpu    = "2000m" # 2 vCPU for parallel agent processing
          memory = "4Gi"   # 4GB Ram for Vector Operations
        }
      }
      env {
        name  = "N8N_AI_CORE"
        value = "true"
      }
      env {
        name  = "N8N_METRICS" # Self-monitoring enabled
        value = "true"
      }
    }
    scaling {
      min_instance_count = 1  # Keep 1 warm for instant response
      max_instance_count = 10 # Cap for safety
    }
  }
}
