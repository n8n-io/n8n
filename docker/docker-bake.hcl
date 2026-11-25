# Every n8n image build uses this file. `pnpm build:docker` and CI both drive
# these targets, so a pin changed here changes both.
#
# All base image pins are here. The Dockerfiles have no defaults for them. Keep
# each pin a plain string: the podman path of scripts/dockerize-n8n.mjs reads
# them as text. To change n8nio/base or n8nio/node-pc, read docker/AGENTS.md.

variable "NODE_VERSION" { default = "26.13.0" }

# n8nio/base builds on these. The tag of each base is the Node version of its
# DHI ref. The Node 24 base supplies the 1.x runtime image.
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

# Published by build-node-pc-image.yml on master. The n8n image compiles native
# addons in these images and copies their compiled Node onto RUNTIME_IMAGE.
variable "N8N_BUILDER_IMAGE" {
  default = "n8nio/node-patched:26.13.0-6484e2d8092f46c7ce7a4fbd97847ba3cb539e72-dev@sha256:2bb25015cc92814809410aaab21ad5696a901a2f58c9bce6ed5faeafe4fd5f15"
}
variable "PC_BUILDER_IMAGE" {
  default = "n8nio/node-pc:26.13.0-c191db3de7f8187af3f35a59c2a1ca6833c66afc-dev@sha256:c1ff9dd826920453d5ab67cb3daaa4b3efb5270cf45d65b7f393bee7c4ff1857"
}

# Input of n8nio/node-patched for the 1.x image.
# build-node-pc-image.yml publishes node-patched on master.
variable "NODE_24_VERSION" { default = "24.22.3" }

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

# dhi.io/node:26.13.0-alpine3.24-dev@sha256:... -> 26.13.0
function "dhi_node_version" {
  params = [ref]
  result = regex("^dhi\\.io/node:([0-9.]+)-", ref)[0]
}

# python:3.13.18-slim-trixie@sha256:... -> 3.13
function "python_version" {
  params = [image]
  result = regex("^python:([0-9]+\\.[0-9]+)", image)[0]
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
    BUILDER_IMAGE              = N8N_BUILDER_IMAGE
    RUNTIME_IMAGE              = RUNTIME_IMAGE
    ENABLE_POINTER_COMPRESSION = "false"
  }
}

target "n8n-pc" {
  inherits = ["n8n"]
  tags     = tags(N8N_PC_TAGS, "${IMAGE_BASE_NAME}:${IMAGE_TAG}-pc")
  args = {
    BUILDER_IMAGE              = PC_BUILDER_IMAGE
    ENABLE_POINTER_COMPRESSION = "true"
    IMAGE_DESCRIPTION          = "Workflow Automation Tool (pointer-compressed variant, internal to n8n Cloud, no support or stability guarantees)"
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
  args = {
    NODE_IMAGE   = BUILDER_IMAGE
    PYTHON_IMAGE = PYTHON_IMAGE
    ALPINE_IMAGE = ALPINE_IMAGE
  }
}

target "runners-debian" {
  inherits   = ["_app"]
  dockerfile = "docker/images/runners/Dockerfile.debian"
  tags       = tags(RUNNERS_DEBIAN_TAGS, "${RUNNERS_IMAGE_BASE_NAME}:${IMAGE_TAG}-debian")
  args = {
    BUILDER_IMAGE  = DEBIAN_BUILDER_IMAGE
    RUNTIME_IMAGE  = DEBIAN_RUNTIME_IMAGE
    PYTHON_IMAGE   = DEBIAN_PYTHON_IMAGE
    PYTHON_VERSION = python_version(DEBIAN_PYTHON_IMAGE)
    ALPINE_IMAGE   = ALPINE_IMAGE
  }
}

# Every stage that supplies runtime files is on Debian 13, the release of the
# distroless runtime.
target "runners-distroless" {
  inherits   = ["_app"]
  dockerfile = "docker/images/runners/Dockerfile.distroless"
  tags       = tags(RUNNERS_DISTROLESS_TAGS, "${RUNNERS_IMAGE_BASE_NAME}:${IMAGE_TAG}-distroless")
  args = {
    NODE_IMAGE            = DEBIAN_BUILDER_IMAGE
    PYTHON_IMAGE          = DEBIAN_PYTHON_IMAGE
    PYTHON_VERSION        = python_version(DEBIAN_PYTHON_IMAGE)
    ALPINE_IMAGE          = ALPINE_IMAGE
    DISTROLESS_BASE_IMAGE = DISTROLESS_BASE_IMAGE
  }
}

target "base" {
  inherits   = ["_context"]
  dockerfile = "docker/images/n8n-base/Dockerfile"
  args       = { DHI_REF = DHI_REF }
  tags       = tags(BASE_TAGS, "n8nio/base:${dhi_node_version(DHI_REF)}")
}

target "base-debian" {
  inherits   = ["_context"]
  dockerfile = "docker/images/n8n-base/Dockerfile.debian"
  args = {
    DHI_REF      = DEBIAN_DHI_REF
    ALPINE_IMAGE = ALPINE_IMAGE
  }
  tags = tags(BASE_DEBIAN_TAGS, "n8nio/base:${dhi_node_version(DEBIAN_DHI_REF)}-debian")
}

target "base-node-22" {
  inherits = ["base"]
  args     = { DHI_REF = NODE_22_DHI_REF }
  tags     = ["n8nio/base:22"]
}

target "base-node-24" {
  inherits = ["base"]
  args     = { DHI_REF = NODE_24_DHI_REF }
  tags     = ["n8nio/base:${dhi_node_version(NODE_24_DHI_REF)}"]
}

# build-node-pc-image.yml builds the dev stage of all Node source builds and
# sets the tags. None of these depend on RUNTIME_IMAGE, so OS base refreshes
# do not recompile Node.
target "node-pc" {
  inherits   = ["_context"]
  dockerfile = "docker/images/node-pc/Dockerfile"
  target     = "dev"
  args = {
    NODE_VERSION               = NODE_VERSION
    ALPINE_IMAGE               = ALPINE_IMAGE
    ENABLE_POINTER_COMPRESSION = "true"
  }
  tags = ["n8nio/node-pc:${NODE_VERSION}-dev"]
}

# Stock-configured Node 24 with the same V8 patches, for the 1.x image.
target "node-patched-24" {
  inherits = ["node-pc"]
  args = {
    NODE_VERSION               = NODE_24_VERSION
    ENABLE_POINTER_COMPRESSION = "false"
  }
  tags = ["n8nio/node-patched:${NODE_24_VERSION}-dev"]
}

# Stock-configured Node 26 with the same V8 patches, for the release images.
target "node-patched-26" {
  inherits = ["node-pc"]
  args = {
    ENABLE_POINTER_COMPRESSION = "false"
  }
  tags = ["n8nio/node-patched:${NODE_VERSION}-dev"]
}

group "default" { targets = ["n8n", "runners"] }
group "distroless" { targets = ["n8n", "runners", "runners-distroless"] }
group "all" { targets = ["base", "n8n", "runners", "runners-distroless"] }
group "release" { targets = ["n8n", "n8n-pc", "n8n-debian", "runners", "runners-distroless", "runners-debian"] }
