# Base images and pinning

Applies to: `docker/docker-bake.hcl`, `docker/images/**/Dockerfile*`.

## A tag and its digest change together

Node pins live in `docker/docker-bake.hcl`; flag a pin default added back to a
Dockerfile. Pins are `tag@sha256:...`. The tag is documentation; the digest
is what actually resolves. Flag a diff that edits one without the other — a
bumped tag with a stale digest silently keeps building the old image, and a
bumped digest under an old tag lies about what it runs.

Also flag a base image reference that loses its digest entirely, and a
`FROM`/`ARG` that introduces a floating tag such as `latest`, `alpine`, or a
major-only version.

## Node version consistency

`NODE_VERSION`, the DHI refs, the builder tags, and the runtime base tags
describe the same Node release, on the Alpine and Debian tracks. Flag a bump
that moves one and leaves another behind.

## The runtime base only changes here

A separate workflow builds `n8nio/base`; a new base reaches an image only when
its runtime pin changes in the bake file. Flag a PR that expects a base change
to arrive on its own, and flag a runtime stage that installs a compiler or
build dependency — the runtime base ships without one deliberately, and build
tooling belongs in a builder stage that is discarded.
