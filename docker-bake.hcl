# Single source of truth for n8n image builds (Phase 1 consolidation).
# Local: `docker buildx bake n8n`. CI: the build-image action calls the same.
# The file is context-agnostic — turbo cache coordinates + network come from
# the caller (env vars / --set), so the SAME definition works on Blacksmith
# (localhost + --network=host) and locally (host.docker.internal + add-host).

variable "TAG"        { default = "local" }
variable "REGISTRY"   { default = "" }        # "" = local tag; CI sets e.g. ghcr.io/n8n-io/
variable "TURBO_API"  { default = "" }        # empty = build cold (no remote turbo cache)
variable "TURBO_TEAM" { default = "n8n-musl" }

target "_base" {
  context = "."
}

# In-image n8n build. Phase 1 proves the harness against this target; the same
# shape will hold a D1 (COPY ./compiled) variant during migration.
target "n8n" {
  inherits   = ["_base"]
  dockerfile = "docker/images/n8n/Dockerfile.inbuild"
  tags       = ["${REGISTRY}n8nio/n8n:${TAG}"]
  args = {
    TURBO_API  = "${TURBO_API}"
    TURBO_TEAM = "${TURBO_TEAM}"
  }
  secret    = ["id=TURBO_TOKEN,env=TURBO_TOKEN"]
  add-hosts = ["host.docker.internal:host-gateway"]   # local reach to ducktors; harmless on Linux CI
}

group "default" { targets = ["n8n"] }
