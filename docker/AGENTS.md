# Docker images

Read this before you change `docker/docker-bake.hcl` or a Dockerfile in
`docker/images/`.

## Pins

- `docker/docker-bake.hcl` holds all base image pins of the n8n, runners, base
  and node-pc images. Their Dockerfiles have no defaults for them, so build
  through bake: `pnpm build:docker` or `docker buildx bake`.
- Pin an image as `tag@sha256:<digest of the multi-arch index>`. Change the
  tag and the digest together.
- Keep each pin a plain string. The podman path of `scripts/dockerize-n8n.mjs`
  reads them as text.

## Images that n8n publishes take two PRs

n8n publishes `n8nio/base`, `n8nio/node-pc` and `n8nio/node-patched`, and the
n8n images pin them. Master publishes `n8nio/node-patched` for the `1.x`
and release branches. On a branch without a bake file, the pin PR edits the
`ARG` defaults of its `docker/images/n8n/Dockerfile`.

1. **Inputs PR.** Change the inputs of the image. CI builds the image on the
   PR, but does not publish it. On merge, master publishes it with a tag that
   ends in the full merge commit SHA.
2. **Pin PR.** Pin that tag with its digest in the bake file, for example
   `n8nio/base:26.13.0-<commit>@sha256:<digest>`. Read the digest with
   `docker buildx imagetools inspect <image>:<tag>`. This tag never moves, so
   the pin shows which master commit built the image.

| Pin | Tag to read |
|---|---|
| `RUNTIME_IMAGE` | `n8nio/base:<version>-<commit>` |
| `DEBIAN_RUNTIME_IMAGE` | `n8nio/base:<version>-debian-<commit>` |
| `N8N_BUILDER_IMAGE` | `n8nio/node-patched:<version>-<commit>-dev` |
| `PC_BUILDER_IMAGE` | `n8nio/node-pc:<version>-<commit>-dev` |
| `RUNTIME_IMAGE` (`1.x` Dockerfile) | `n8nio/base:<Node 24 version>-<commit>` |
| `BUILDER_IMAGE` (`1.x` Dockerfile) | `n8nio/node-patched:<Node 24 version>-<commit>-dev` |

The `n8n` and `n8n-pc` Dockerfiles build on `RUNTIME_IMAGE` (`n8nio/base`) and
copy the compiled Node binaries from their `*-dev` builder image. OS base
refreshes therefore pin `RUNTIME_IMAGE` only and do not recompile Node.

| Image | Inputs (PR 1) | Pins (PR 2) |
|---|---|---|
| `n8nio/base` | `DHI_REF`, `n8n-base/Dockerfile` | `RUNTIME_IMAGE` |
| `n8nio/base:*-debian` | `DEBIAN_DHI_REF`, `ALPINE_IMAGE`, `n8n-base/Dockerfile.debian` | `DEBIAN_RUNTIME_IMAGE` |
| `n8nio/node-pc` | `NODE_VERSION`, `ALPINE_IMAGE`, `node-pc/Dockerfile`, `node-pc/patches/*`, `node-pc/check-v8-patches.js` | `PC_BUILDER_IMAGE` |
| `n8nio/node-patched` (Node 24) | `NODE_24_VERSION`, `ALPINE_IMAGE`, and the `node-pc` files | `BUILDER_IMAGE` in `docker/images/n8n/Dockerfile` on the `1.x` branch |
| `n8nio/node-patched` (Node 26) | `NODE_VERSION`, `ALPINE_IMAGE`, and the `node-pc` files | `N8N_BUILDER_IMAGE` |

- A push to master publishes an image only when its inputs changed. A pin PR
  changes no input of the image that it pins, so the tag stays on the pin.
- `n8nio/node-pc` and `n8nio/node-patched` do not depend on `RUNTIME_IMAGE`.
  A base image refresh takes two PRs (`DHI_REF` → `RUNTIME_IMAGE`) and does
  not trigger `build-node-pc-image.yml`.
- Only master publishes. The workflows stop a dispatch with `push` on another
  branch.
- A dispatch on master with `push` always publishes. Use it when a publish run
  failed, when only the workflow changed, or to get patched OS packages. Then
  pin the new digest. Set `targets` to build only some bases, so the tags of
  the other bases stay on their digests.
- `sec-base-image-refresh.yml` dispatches `build-base-image.yml` for a base
  when a package that the base installs has a fix. If the rebuilt base has
  fewer findings, it pins the base 24 hours later (a manual run does not
  wait). Otherwise, it sends an alert.

The `node-patched-26` target uses the same Node version as `node-pc`, with
pointer compression off. The workflow publishes `-dev` tags for Node 24 and
Node 26. It builds each variant on native amd64 and arm64 runners and creates
a multi-arch manifest for each tag.

### Example: a new Node version

1. Change `DHI_REF`, `DEBIAN_DHI_REF`, `NODE_VERSION`, `BUILDER_IMAGE`, and
   `DEBIAN_BUILDER_IMAGE`. Master publishes the new bases (`n8nio/base`),
   `n8nio/node-pc:*-dev`, and `n8nio/node-patched:*-dev`.
2. Pin `RUNTIME_IMAGE`, `DEBIAN_RUNTIME_IMAGE`, `N8N_BUILDER_IMAGE`, and
   `PC_BUILDER_IMAGE`.

For a Node 24 update, change `NODE_24_DHI_REF` and `NODE_24_VERSION`. After
master publishes `n8nio/base` and `n8nio/node-patched:*-dev`, pin
`RUNTIME_IMAGE` and `BUILDER_IMAGE` in the `1.x` Dockerfile.

Other third-party pins (`node`, `python`, `alpine`, distroless) change in one
PR.
