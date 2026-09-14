# Base images and pinning

Applies to: `docker/images/**/Dockerfile*`.

## A tag and its digest change together

Base images are pinned as `tag@sha256:...`. The tag is documentation; the digest
is what actually resolves. Flag a diff that edits one without the other — a
bumped tag with a stale digest silently keeps building the old image, and a
bumped digest under an old tag makes the Dockerfile lie about what it runs.

```dockerfile
ARG BUILDER_IMAGE=node:26.7.0-alpine3.24@sha256:aadf41...
ARG RUNTIME_IMAGE=n8nio/base:26.7.0@sha256:336873...
```

Also flag a base image reference that loses its digest entirely, and a
`FROM`/`ARG` that introduces a floating tag such as `latest`, `alpine`, or a
major-only version.

## Node version consistency

`ARG NODE_VERSION`, the builder tag, and the runtime base tag describe the same
Node release. Flag a bump that moves one and leaves another behind.

## The runtime base only changes here

A separate workflow builds `n8nio/base`; a new base reaches the n8n image only
when `RUNTIME_IMAGE` changes in this file. Flag a PR that expects a base change
to arrive on its own, and flag a runtime stage that installs a compiler or
build dependency — the runtime base ships without one deliberately, and build
tooling belongs in a builder stage that is discarded.
