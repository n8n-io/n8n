variable "N8N_VERSION" {
  default = "1.84.1"
}

variable "TARGETPLATFORM" {
  default = "linux/arm64"
}


// k8s cluster envrionment (short-name): dev, tools, prod 
variable "ENVIRONMENT" {
  default = "dev"
}

target "common" {
  dockerfile = "./Dockerfile"
  context = "./docker/images/n8n"

  args = {
    N8N_VERSION = "${N8N_VERSION}"
    TARGETPLATFORM = "${TARGETPLATFORM}"
  }

}

target "arm64" {
  inherits = ["common"]
  platforms = ["${TARGETPLATFORM}"]
  tags = [
    "ghcr.io/g2crowd/n8n-${ENVIRONMENT}-arm64:${N8N_VERSION}"
  ]
}

target "default" {
  inherits = ["arm64"]
}
