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
| `N8N_RUNTIME_IMAGE` | `n8nio/node-patched:<version>-<commit>` |
| `N8N_BUILDER_IMAGE` | `n8nio/node-patched:<version>-<commit>-dev` |
| `PC_RUNTIME_IMAGE` | `n8nio/node-pc:<version>-<commit>` |
| `PC_BUILDER_IMAGE` | `n8nio/node-pc:<version>-<commit>-dev` |
| `NODE_24_RUNTIME_IMAGE` | `n8nio/base:<Node 24 version>-<commit>` |
| `RUNTIME_IMAGE` (`1.x` Dockerfile, after the switch) | `n8nio/node-patched:<Node 24 version>-<commit>` |
| `BUILDER_IMAGE` (`1.x` Dockerfile, after the switch) | `n8nio/node-patched:<Node 24 version>-<commit>-dev` |
| `RUNTIME_IMAGE` (Node 26 release branch) | `n8nio/node-patched:<version>-<commit>` |
| `BUILDER_IMAGE` (Node 26 release branch) | `n8nio/node-patched:<version>-<commit>-dev` |

Before the switch, the `1.x` Dockerfile pins `RUNTIME_IMAGE` to `n8nio/base`
and `BUILDER_IMAGE` to the official `node` image. After master publishes the
patched Node 24 images, change both pins to `n8nio/node-patched`. Keep
`NODE_24_RUNTIME_IMAGE` on the master-published `n8nio/base` Node 24 image.
Do not copy the new `1.x` runtime pin into this input.

| Image | Inputs (PR 1) | Pins (PR 2) |
|---|---|---|
| `n8nio/base` | `DHI_REF`, `n8n-base/Dockerfile` | `RUNTIME_IMAGE` |
| `n8nio/base:*-debian` | `DEBIAN_DHI_REF`, `ALPINE_IMAGE`, `n8n-base/Dockerfile.debian` | `DEBIAN_RUNTIME_IMAGE` |
| `n8nio/node-pc` | `NODE_VERSION`, `RUNTIME_IMAGE`, `ALPINE_IMAGE`, `node-pc/Dockerfile`, `node-pc/patches/*`, `node-pc/check-v8-patches.js` | `PC_BUILDER_IMAGE`, `PC_RUNTIME_IMAGE` |
| `n8nio/node-patched` (Node 24) | `NODE_24_VERSION`, `NODE_24_RUNTIME_IMAGE`, `ALPINE_IMAGE`, and the `node-pc` files | `BUILDER_IMAGE`, `RUNTIME_IMAGE` in `docker/images/n8n/Dockerfile` on the `1.x` branch |
| `n8nio/node-patched` (Node 26) | `NODE_VERSION`, `RUNTIME_IMAGE`, `ALPINE_IMAGE`, and the `node-pc` files | `BUILDER_IMAGE`, `RUNTIME_IMAGE` on the Node 26 release branches |

- A push to master publishes an image only when its inputs changed. A pin PR
  changes no input of the image that it pins, so the tag stays on the pin.
- `RUNTIME_IMAGE` is an input of `n8nio/node-pc`. So the pin PR of a new base
  is the inputs PR of node-pc, and the `-pc` images need a third PR.
- Only master publishes. The workflows stop a dispatch with `push` on another
  branch.
- A dispatch on master with `push` always publishes. Use it when a publish run
  failed, when only the workflow changed, or to get patched OS packages. Then
  pin the new digest.

The `node-patched-26` target uses the same Node version and runtime base as
`node-pc`, with pointer compression off. The workflow publishes runtime and
`-dev` tags for Node 24 and Node 26. It builds each variant on native amd64
and arm64 runners and creates a multi-arch manifest for each tag. After master
publishes, pin the Node 26 runtime and `-dev` digests on the branches selected
for stable and beta releases.

### Example: a new Node version

1. Change `DHI_REF` and `DEBIAN_DHI_REF`. Master publishes the new bases.
2. Change `NODE_VERSION`, `BUILDER_IMAGE` and `DEBIAN_BUILDER_IMAGE`. Pin
   `RUNTIME_IMAGE` and `DEBIAN_RUNTIME_IMAGE`. Master publishes `node-pc`
   and `node-patched-26` from these inputs.
3. Pin `PC_BUILDER_IMAGE` and `PC_RUNTIME_IMAGE`. Pin the Node 26
   `n8nio/node-patched` runtime and `-dev` digests in the release branches.

For a Node 24 update, change `NODE_24_DHI_REF` first. After master publishes
the base, pin it in `NODE_24_RUNTIME_IMAGE` and change `NODE_24_VERSION`.
After master publishes `node-patched-24`, pin its runtime and `-dev` digests
in the `1.x` Dockerfile.

Other third-party pins (`node`, `python`, `alpine`, distroless) change in one
PR.
