# Single source of truth for n8n image builds (Phase 1 consolidation).
# Local: `docker buildx bake <target>`. CI: the build-image action runs the same.
# Context-agnostic — Turbo cache coordinates + network come from the caller
# (env / --set), so it works on Blacksmith (localhost + --network=host) and
# locally (host.docker.internal). (Kept as HCL for matrix/conditionals; can
# switch to docker-bake.json later once the migration is complete.)

variable "TAG"          { default = "local" }
variable "REGISTRY"     { default = "n8nio/" }   # namespace prefix; CI sets e.g. ghcr.io/n8n-io/
variable "NODE_VERSION" { default = "24.16.0" }
variable "TURBO_API"    { default = "" }          # empty = build cold (no remote turbo cache)
variable "TURBO_TEAM"   { default = "n8n-musl" }

target "_base" {
  context = "."
}

target "base" {
  inherits   = ["_base"]
  dockerfile = "docker/images/n8n-base/Dockerfile"
  args       = { NODE_VERSION = "${NODE_VERSION}" }
  tags       = ["${REGISTRY}base:${NODE_VERSION}"]
}

# Production n8n — builds from host-produced ./compiled (Phase-1 faithful).
target "n8n" {
  inherits   = ["_base"]
  dockerfile = "docker/images/n8n/Dockerfile"
  tags       = ["${REGISTRY}n8n:${TAG}"]
}

# In-image n8n (DEVP-262) — self-contained, reads the Turbo remote cache.
# Used for verification/measurement; becomes the n8n target in Phase 2.
target "n8n-inbuild" {
  inherits   = ["_base"]
  dockerfile = "docker/images/n8n/Dockerfile.inbuild"
  tags       = ["${REGISTRY}n8n:${TAG}"]
  args       = { TURBO_API = "${TURBO_API}", TURBO_TEAM = "${TURBO_TEAM}" }
  secret     = ["id=TURBO_TOKEN,env=TURBO_TOKEN"]
}

# Runner flavors via matrix — one definition, two images.
target "runner" {
  inherits   = ["_base"]
  name       = "runner-${flavor}"
  matrix     = { flavor = ["alpine", "distroless"] }
  dockerfile = "docker/images/runners/Dockerfile${flavor == "distroless" ? ".distroless" : ""}"
  tags       = ["${REGISTRY}runners:${TAG}${flavor == "distroless" ? "-distroless" : ""}"]
}

target "benchmark" {
  inherits   = ["_base"]
  dockerfile = "packages/@n8n/benchmark/Dockerfile"
  tags       = ["${REGISTRY}n8n-benchmark:${TAG}"]
}

group "default" { targets = ["n8n", "runner-alpine", "runner-distroless"] }
group "all"     { targets = ["base", "n8n", "runner-alpine", "runner-distroless", "benchmark"] }
