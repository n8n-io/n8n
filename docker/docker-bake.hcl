# Every n8n image build uses this file. `pnpm build:docker` and CI both drive
# these targets, so a pin changed here changes both.

# Node pins. The Dockerfiles have no defaults for these, so this block is the
# only place to change them. To move to a new Node version:
#   1. Change NODE_VERSION, the DHI refs and the builder images.
#   2. Publish the bases: dispatch build-base-image.yml with push enabled.
#   3. Change the runtime images to the digests that step 2 published.
# The podman path of scripts/dockerize-n8n.mjs reads these defaults as text.
# Keep each default a plain string.
variable "NODE_VERSION" { default = "26.12.1" }

variable "DHI_REF" {
  default = "dhi.io/node:26.12.1-alpine3.24-dev@sha256:4b1591bfce570a17f9562e206b62e76be84d6df32c3a86bfc677fc87959402cc"
}
variable "BUILDER_IMAGE" {
  default = "node:26.12.1-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797"
}
variable "RUNTIME_IMAGE" {
  default = "n8nio/base:26.12.1@sha256:435e5310b29cfa5880b5512703f7d10bafcf0f5dd700c7adac6ee8cfbe77306a"
}

variable "DEBIAN_DHI_REF" {
  default = "dhi.io/node:26.12.1-debian13-dev@sha256:c8939885965365c675a024d062bcb761bda4b47e95ce0323aa998ac9bc312fd6"
}
variable "DEBIAN_BUILDER_IMAGE" {
  default = "node:26.12.1-trixie-slim@sha256:94816674c62774da0d099a947bf4613b9e1972a2733abd0d0cd80e795f8411d0"
}
variable "DEBIAN_RUNTIME_IMAGE" {
  default = "n8nio/base:26.12.1-debian@sha256:9c6631767d1f3a0c5040757d2ff26ac6109988e0630bad1a764310d6571b4f6d"
}

# build-node-pc-image.yml publishes these.
variable "PC_BUILDER_IMAGE" {
  default = "n8nio/node-pc:26.12.1-dev@sha256:8993967928b6167703f05f28a95f82543974357dcfd4160281cf352490d208ca"
}
variable "PC_RUNTIME_IMAGE" {
  default = "n8nio/node-pc:26.12.1@sha256:15afd63862b7cbc828537b7481f0c58a6e504765b62e7f55a226ad052068f77c"
}

variable "N8N_VERSION" { default = "snapshot" }
variable "N8N_RELEASE_TYPE" { default = "dev" }

variable "IMAGE_BASE_NAME" { default = "n8nio/n8n" }
variable "IMAGE_TAG" { default = "local" }
variable "RUNNERS_IMAGE_BASE_NAME" { default = "n8nio/runners" }

variable "N8N_TAGS" { default = "" }
variable "N8N_PC_TAGS" { default = "" }
variable "N8N_DEBIAN_TAGS" { default = "" }
variable "RUNNERS_TAGS" { default = "" }
variable "RUNNERS_DISTROLESS_TAGS" { default = "" }
variable "RUNNERS_DEBIAN_TAGS" { default = "" }
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
  args = {
    BUILDER_IMAGE = BUILDER_IMAGE
    RUNTIME_IMAGE = RUNTIME_IMAGE
  }
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

target "n8n-debian" {
  inherits   = ["_app"]
  dockerfile = "docker/images/n8n/Dockerfile.debian"
  tags       = tags(N8N_DEBIAN_TAGS, "${IMAGE_BASE_NAME}:${IMAGE_TAG}-debian")
  args = {
    BUILDER_IMAGE = DEBIAN_BUILDER_IMAGE
    RUNTIME_IMAGE = DEBIAN_RUNTIME_IMAGE
  }
}

target "runners" {
  inherits   = ["_app"]
  dockerfile = "docker/images/runners/Dockerfile"
  tags       = tags(RUNNERS_TAGS, "${RUNNERS_IMAGE_BASE_NAME}:${IMAGE_TAG}")
}

target "runners-debian" {
  inherits   = ["_app"]
  dockerfile = "docker/images/runners/Dockerfile.debian"
  tags       = tags(RUNNERS_DEBIAN_TAGS, "${RUNNERS_IMAGE_BASE_NAME}:${IMAGE_TAG}-debian")
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

target "base-debian" {
  inherits   = ["_context"]
  dockerfile = "docker/images/n8n-base/Dockerfile.debian"
  args       = { DHI_REF = DEBIAN_DHI_REF }
  tags       = tags(BASE_DEBIAN_TAGS, "n8nio/base:${NODE_VERSION}-debian")
}

group "default" { targets = ["n8n", "runners"] }
group "distroless" { targets = ["n8n", "runners", "runners-distroless"] }
group "all" { targets = ["base", "n8n", "runners", "runners-distroless"] }
group "release" { targets = ["n8n", "n8n-pc", "n8n-debian", "runners", "runners-distroless", "runners-debian"] }
