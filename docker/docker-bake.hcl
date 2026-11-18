# Every n8n image build uses this file. `pnpm build:docker` and CI both drive
# these targets, so a pin changed here changes both.

variable "NODE_VERSION" { default = "26.13.0" }
variable "N8N_VERSION" { default = "snapshot" }
variable "N8N_RELEASE_TYPE" { default = "dev" }

variable "IMAGE_BASE_NAME" { default = "n8nio/n8n" }
variable "IMAGE_TAG" { default = "local" }
variable "RUNNERS_IMAGE_BASE_NAME" { default = "n8nio/runners" }

# An empty value keeps the Dockerfile ARG default, so `docker build` still
# works. The n8n-pc target always sets these.
variable "BUILDER_IMAGE" { default = "" }
variable "RUNTIME_IMAGE" { default = "" }

variable "PC_BUILDER_IMAGE" {
  default = "n8nio/node-pc:26.13.0-c191db3de7f8187af3f35a59c2a1ca6833c66afc-dev@sha256:c1ff9dd826920453d5ab67cb3daaa4b3efb5270cf45d65b7f393bee7c4ff1857"
}
variable "PC_RUNTIME_IMAGE" {
  default = "n8nio/node-pc:26.13.0-c191db3de7f8187af3f35a59c2a1ca6833c66afc@sha256:757a7ca4022a4a2aebdc6e1f07e9d08016e446994aed1c8473922df54a14eb01"
}

variable "DHI_REF" {
  default = "dhi.io/node:26.13.0-alpine3.24-dev@sha256:3e61a81f5d83780aff01cb2d8f2251698bf3fe7d522bef71a9656fa93333b504"
}

variable "N8N_TAGS" { default = "" }
variable "N8N_PC_TAGS" { default = "" }
variable "RUNNERS_TAGS" { default = "" }
variable "RUNNERS_DISTROLESS_TAGS" { default = "" }
variable "BASE_TAGS" { default = "" }

variable "PLATFORMS" { default = "" }

function "tags" {
  params = [override, fallback]
  result = override != "" ? split(",", override) : [fallback]
}

target "_context" {
  context = "."
  # BAKE_LOCAL_PLATFORM gives the host platform. On macOS it reads
  # `darwin/arm64/v8`. These images are linux, so use the architecture only.
  platforms = PLATFORMS != "" ? split(",", PLATFORMS) : ["linux/${split("/", BAKE_LOCAL_PLATFORM)[1]}"]
}

target "_app" {
  inherits = ["_context"]
  args = {
    NODE_VERSION     = NODE_VERSION
    N8N_VERSION      = N8N_VERSION
    N8N_RELEASE_TYPE = N8N_RELEASE_TYPE
  }
}

target "n8n" {
  inherits   = ["_app"]
  dockerfile = "docker/images/n8n/Dockerfile"
  tags       = tags(N8N_TAGS, "${IMAGE_BASE_NAME}:${IMAGE_TAG}")
  args = merge(
    BUILDER_IMAGE != "" ? { BUILDER_IMAGE = BUILDER_IMAGE } : {},
    RUNTIME_IMAGE != "" ? { RUNTIME_IMAGE = RUNTIME_IMAGE } : {},
  )
}

target "n8n-pc" {
  inherits = ["n8n"]
  tags     = tags(N8N_PC_TAGS, "${IMAGE_BASE_NAME}:${IMAGE_TAG}-pc")
  args = {
    BUILDER_IMAGE     = PC_BUILDER_IMAGE
    RUNTIME_IMAGE     = PC_RUNTIME_IMAGE
    IMAGE_DESCRIPTION = "Workflow Automation Tool (pointer-compressed variant, internal to n8n Cloud, no support or stability guarantees)"
  }
}

target "runners" {
  inherits   = ["_app"]
  dockerfile = "docker/images/runners/Dockerfile"
  tags       = tags(RUNNERS_TAGS, "${RUNNERS_IMAGE_BASE_NAME}:${IMAGE_TAG}")
}

target "runners-distroless" {
  inherits   = ["_app"]
  dockerfile = "docker/images/runners/Dockerfile.distroless"
  tags       = tags(RUNNERS_DISTROLESS_TAGS, "${RUNNERS_IMAGE_BASE_NAME}:${IMAGE_TAG}-distroless")
}

target "base" {
  inherits   = ["_context"]
  dockerfile = "docker/images/n8n-base/Dockerfile"
  args       = { DHI_REF = DHI_REF }
  tags       = tags(BASE_TAGS, "n8nio/base:${NODE_VERSION}")
}

group "default" { targets = ["n8n", "runners"] }
group "distroless" { targets = ["n8n", "runners", "runners-distroless"] }
group "all" { targets = ["base", "n8n", "runners", "runners-distroless"] }
group "release" { targets = ["n8n", "n8n-pc", "runners", "runners-distroless"] }
