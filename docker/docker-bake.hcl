# Every n8n image build uses this file. `pnpm build:docker` and CI both drive
# these targets, so a pin changed here changes both.

variable "NODE_VERSION" { default = "26.13.0" }
<<<<<<< HEAD
=======

# n8nio/base builds on these. The tag of each base is the Node version of its
# DHI ref. No n8n image uses the Node 22 and 24 bases.
variable "DHI_REF" {
  default = "dhi.io/node:26.13.0-alpine3.24-dev@sha256:3e61a81f5d83780aff01cb2d8f2251698bf3fe7d522bef71a9656fa93333b504"
}
variable "DEBIAN_DHI_REF" {
  default = "dhi.io/node:26.13.0-debian13-dev@sha256:6c7e2d41ac2cad140e61f765740708f5ab19ac3e734b3d56e029923cb11be4fd"
}
variable "NODE_22_DHI_REF" {
  default = "dhi.io/node:22.23.4-alpine3.24-dev@sha256:6074fc885bbf6a1c707d16189076cd2b9d989095abfc4f3f973dac93455bdae5"
}
variable "NODE_24_DHI_REF" {
  default = "dhi.io/node:24.22.2-alpine3.24-dev@sha256:e640b13bfdb3befe5820fde98520aba1d81de96ebb5237f1f3a166352924707a"
}

variable "BUILDER_IMAGE" {
  default = "node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216"
}
variable "DEBIAN_BUILDER_IMAGE" {
  default = "node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072"
}

# Published by build-base-image.yml on master.
variable "RUNTIME_IMAGE" {
  default = "n8nio/base:26.13.0-c86615646b167060211ad428f021f59099b62284@sha256:02079402e2a7f33a41e8bf8943a2f6a08b45fd7a749abafaa20ef44bf4b6fd76"
}
variable "DEBIAN_RUNTIME_IMAGE" {
  default = "n8nio/base:26.13.0-debian-b23a3454e958998b052277c130ee6f9f027427f0@sha256:cbdcf28cd718a9a3c8490cd2ee80dd61869e19e3a663ab0f7b762eb5e7ee2f4a"
}

# Published by build-node-pc-image.yml on master.
variable "PC_BUILDER_IMAGE" {
  default = "n8nio/node-pc:26.13.0-c191db3de7f8187af3f35a59c2a1ca6833c66afc-dev@sha256:c1ff9dd826920453d5ab67cb3daaa4b3efb5270cf45d65b7f393bee7c4ff1857"
}
variable "PC_RUNTIME_IMAGE" {
  default = "n8nio/node-pc:26.13.0-c191db3de7f8187af3f35a59c2a1ca6833c66afc@sha256:757a7ca4022a4a2aebdc6e1f07e9d08016e446994aed1c8473922df54a14eb01"
}

# Other base images. The runners take their Python version from the image tag.
variable "ALPINE_IMAGE" {
  default = "alpine:3.24.3@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a"
}
variable "PYTHON_IMAGE" {
  default = "python:3.13.18-alpine3.24@sha256:7984cf56ceaddebe4fefeb75d64000b9f45d8b77b11a09b24524da6cdc3af0c8"
}
# Debian 13, the release of the distroless runtime. That image runs the glibc
# of this Python image.
variable "DEBIAN_PYTHON_IMAGE" {
  default = "python:3.13.18-slim-trixie@sha256:ae14d4ce8771606477a81446e7ef429edd6762305fc50c84507c1041fa8285d1"
}
variable "DISTROLESS_BASE_IMAGE" {
  default = "gcr.io/distroless/cc-debian13:latest@sha256:e1f5543d45a2cd7c02a5b43dda5f0ff30729b4832113759d01ed39b0b152cddb"
}

>>>>>>> 1ae5175a (build: Pin the node-pc images that master published from #43624 (no-changelog) (#43691))
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
  default = "n8nio/node-pc:26.13.0-dev@sha256:05a717732c5499d22e39221e3e34f348a310bb03b3864a46a06ed7a7fad42cfc"
}
variable "PC_RUNTIME_IMAGE" {
  default = "n8nio/node-pc:26.13.0@sha256:04d0ff20910be5ceb7cc78010318f4197e120d8806ef6e93162691ea1c70813d"
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
