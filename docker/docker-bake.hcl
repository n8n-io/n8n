# Every n8n image build uses this file. `pnpm build:docker` and CI both drive
# these targets, so a pin changed here changes both.

variable "NODE_VERSION" { default = "26.10.0" }
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
  default = "n8nio/node-pc:26.10.0-dev@sha256:61e4b1f3b3824ffb908812e01bcbddabb64a01ef23d408d561696c344c6679e3"
}
variable "PC_RUNTIME_IMAGE" {
  default = "n8nio/node-pc:26.10.0@sha256:386bae24d41c0091d21b4eee124a86464710fff24d5cb7f37386c4c5649b0c89"
}

variable "DHI_REF" {
  default = "dhi.io/node:26.10.0-alpine3.24-dev@sha256:8da859df5dc853c923ace53c4cfe994a909a28917f7fcfc8508869beab8cf132"
}

variable "N8N_TAGS" { default = "" }
variable "N8N_PC_TAGS" { default = "" }
variable "RUNNERS_TAGS" { default = "" }
variable "RUNNERS_DISTROLESS_TAGS" { default = "" }
variable "BASE_TAGS" { default = "" }
variable "BASE_DEBIAN_TAGS" { default = "" }

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

# The glibc base. Users build on top of it to add vendor libraries. The DHI
# reference is the Dockerfile default.
target "base-debian" {
  inherits   = ["_context"]
  dockerfile = "docker/images/n8n-base/Dockerfile.debian"
  tags       = tags(BASE_DEBIAN_TAGS, "n8nio/base:${NODE_VERSION}-debian")
}

group "default" { targets = ["n8n", "runners"] }
group "distroless" { targets = ["n8n", "runners", "runners-distroless"] }
group "all" { targets = ["base", "n8n", "runners", "runners-distroless"] }
group "release" { targets = ["n8n", "n8n-pc", "runners", "runners-distroless"] }
