# Every n8n image build uses this file. `pnpm build:docker` and CI both drive
# these targets, so a pin changed here changes both.
#
# This file is the only place for base image pins: the Dockerfiles have no
# defaults for them. The podman path of scripts/dockerize-n8n.mjs reads the
# defaults as text, so keep each one a plain string.
#
# Images that n8n publishes (n8nio/base, n8nio/node-pc) take two PRs. See
# docker/AGENTS.md. In short: the first PR changes their inputs, master
# publishes them on merge, and the second PR pins the digest master published.

variable "NODE_VERSION" { default = "26.13.0" }

# n8nio/base and n8nio/base:*-debian build on these. The base tag is the Node
# version of the DHI ref.
variable "DHI_REF" {
  default = "dhi.io/node:26.13.0-alpine3.24-dev@sha256:3e61a81f5d83780aff01cb2d8f2251698bf3fe7d522bef71a9656fa93333b504"
}
variable "DEBIAN_DHI_REF" {
  default = "dhi.io/node:26.13.0-debian13-dev@sha256:6c7e2d41ac2cad140e61f765740708f5ab19ac3e734b3d56e029923cb11be4fd"
}

variable "BUILDER_IMAGE" {
  default = "node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216"
}
variable "DEBIAN_BUILDER_IMAGE" {
  default = "node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072"
}

# Published by build-base-image.yml on master. Pin the <version>-<commit> tag's
# digest.
variable "RUNTIME_IMAGE" {
  default = "n8nio/base:26.13.0@sha256:02079402e2a7f33a41e8bf8943a2f6a08b45fd7a749abafaa20ef44bf4b6fd76"
}
variable "DEBIAN_RUNTIME_IMAGE" {
  default = "n8nio/base:26.13.0-debian@sha256:f7c8a059f942c7656154c18b17e1e739c79e23fe3b42475984f65f79eed0156f"
}

# Published by build-node-pc-image.yml on master, from NODE_VERSION and
# RUNTIME_IMAGE. Pin the <version>-<commit> tag's digest.
variable "PC_BUILDER_IMAGE" {
  default = "n8nio/node-pc:26.13.0-dev@sha256:3c61f963d32a93401083fa4b8ed97aa42fb8f4b05c4de2e724a9097d15184311"
}
variable "PC_RUNTIME_IMAGE" {
  default = "n8nio/node-pc:26.13.0@sha256:19679b11bf8a89494668c3d86030f92532c2fbdd92a49eb14c813c59ad09d10d"
}

# Other base images. The runners take their Python version from the image tag.
variable "ALPINE_IMAGE" {
  default = "alpine:3.24.3@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a"
}
variable "PYTHON_IMAGE" {
  default = "python:3.13.18-alpine3.24@sha256:7984cf56ceaddebe4fefeb75d64000b9f45d8b77b11a09b24524da6cdc3af0c8"
}
# Debian 13, like the distroless runtime: that image runs this Python's glibc.
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

# build-node-pc-image.yml builds these per architecture and sets the tags.
target "node-pc" {
  inherits   = ["_context"]
  dockerfile = "docker/images/node-pc/Dockerfile"
  target     = "runtime"
  args = {
    NODE_VERSION  = NODE_VERSION
    ALPINE_IMAGE  = ALPINE_IMAGE
    RUNTIME_IMAGE = RUNTIME_IMAGE
  }
  tags = ["n8nio/node-pc:${NODE_VERSION}"]
}

target "node-pc-dev" {
  inherits = ["node-pc"]
  target   = "dev"
  tags     = ["n8nio/node-pc:${NODE_VERSION}-dev"]
}

group "default" { targets = ["n8n", "runners"] }
group "distroless" { targets = ["n8n", "runners", "runners-distroless"] }
group "all" { targets = ["base", "n8n", "runners", "runners-distroless"] }
group "release" { targets = ["n8n", "n8n-pc", "n8n-debian", "runners", "runners-distroless", "runners-debian"] }
