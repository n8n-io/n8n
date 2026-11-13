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

n8n publishes `n8nio/base` and `n8nio/node-pc`, and the n8n images pin them.

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
| `PC_RUNTIME_IMAGE` | `n8nio/node-pc:<version>-<commit>` |
| `PC_BUILDER_IMAGE` | `n8nio/node-pc:<version>-<commit>-dev` |

| Image | Inputs (PR 1) | Pins (PR 2) |
|---|---|---|
| `n8nio/base` | `DHI_REF`, `n8n-base/Dockerfile` | `RUNTIME_IMAGE` |
| `n8nio/base:*-debian` | `DEBIAN_DHI_REF`, `ALPINE_IMAGE`, `n8n-base/Dockerfile.debian` | `DEBIAN_RUNTIME_IMAGE` |
| `n8nio/node-pc` | `NODE_VERSION`, `RUNTIME_IMAGE`, `ALPINE_IMAGE`, `node-pc/Dockerfile`, `node-pc/patches/*`, `node-pc/check-v8-patches.js` | `PC_BUILDER_IMAGE`, `PC_RUNTIME_IMAGE` |

- A push to master publishes an image only when its inputs changed. A pin PR
  changes no input of the image that it pins, so the tag stays on the pin.
- `RUNTIME_IMAGE` is an input of `n8nio/node-pc`. So the pin PR of a new base
  is the inputs PR of node-pc, and the `-pc` images need a third PR.
- Only master publishes. The workflows stop a dispatch with `push` on another
  branch.
- A dispatch on master with `push` always publishes. Use it when a publish run
  failed, when only the workflow changed, or to get patched OS packages. Then
  pin the new digest.

### Example: a new Node version

1. Change `DHI_REF` and `DEBIAN_DHI_REF`.
2. Change `NODE_VERSION`, `BUILDER_IMAGE` and `DEBIAN_BUILDER_IMAGE`. Pin
   `RUNTIME_IMAGE` and `DEBIAN_RUNTIME_IMAGE`.
3. Pin `PC_BUILDER_IMAGE` and `PC_RUNTIME_IMAGE`.

Other third-party pins (`node`, `python`, `alpine`, distroless) change in one
PR.
