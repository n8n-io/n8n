# Base images and pinning

Applies to: `docker/docker-bake.hcl`, `docker/images/**/Dockerfile*`.

## A tag and its digest change together

The n8n, runners, base and node-pc pins live in `docker/docker-bake.hcl` as
plain strings (podman parses them); flag a pin default added back to those
Dockerfiles. `engine` keeps its own.
Pins are `tag@sha256:...`. The tag is documentation; the digest is what
actually resolves. Flag a diff that edits one without the other — a bumped tag
with a stale digest silently keeps building the old image, and a bumped digest
under an old tag lies about what it runs.

Also flag a base image reference that loses its digest entirely, and a
`FROM`/`ARG` that introduces a floating tag such as `latest`, `alpine`, or a
major-only version.

## Images n8n publishes take two PRs

`n8nio/base` and `n8nio/node-pc` change in two PRs (`docker/AGENTS.md`): one
changes their inputs, and master publishes them on merge; the next pins the
digest of the `<version>-<commit>` tag master published. Flag a pin of an
image that a branch published, a PR that mixes the two steps for one image, a
Node bump whose `NODE_VERSION`, builder and runtime pins disagree, and a
runtime stage that installs a compiler or build dependency — build tooling
belongs in a builder stage that is discarded.
