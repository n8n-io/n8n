# Docker images

Read this before you change `docker/docker-bake.hcl` or a Dockerfile in
`docker/images/`.

## Pins

- `docker/docker-bake.hcl` holds every base image pin of the n8n, runners,
  base and node-pc images. Their Dockerfiles declare the `ARG` without a
  default, so build them through bake (`pnpm build:docker` or
  `docker buildx bake`).
- Pin an image as `tag@sha256:<digest of the multi-arch index>`. Change the
  tag and the digest together.
- Keep each pin a plain string. The podman path of
  `scripts/dockerize-n8n.mjs` reads them as text.

## Images that n8n publishes take two PRs

n8n builds `n8nio/base` (also `-debian`) and `n8nio/node-pc` from inputs in
this repository, and the n8n images pin them. Change them in two PRs:

1. **Inputs PR.** Change the inputs of the image. CI builds the image on the
   PR, but does not publish it. When the PR merges, master publishes the image
   as `<version>` and `<version>-<merge commit>`.
2. **Pin PR.** Read the digest of the `<version>-<merge commit>` tag, for
   example with `docker buildx imagetools inspect n8nio/base:26.13.0-<commit>`.
   Set that digest in the bake file.

| Image | Inputs (PR 1) | Pins (PR 2) | Workflow |
|---|---|---|---|
| `n8nio/base` | `DHI_REF`, `n8n-base/Dockerfile` | `RUNTIME_IMAGE` | `build-base-image.yml` |
| `n8nio/base:*-debian` | `DEBIAN_DHI_REF`, `ALPINE_IMAGE`, `n8n-base/Dockerfile.debian` | `DEBIAN_RUNTIME_IMAGE` | `build-base-image.yml` |
| `n8nio/node-pc` | `NODE_VERSION`, `RUNTIME_IMAGE`, `ALPINE_IMAGE`, `node-pc/Dockerfile` | `PC_BUILDER_IMAGE`, `PC_RUNTIME_IMAGE` | `build-node-pc-image.yml` |

Rules:

- Do not publish from a branch. The workflows stop a dispatch with `push`
  enabled on any branch except master.
- Pin only a digest that master published.
- Master publishes an image only when its inputs changed
  (`.github/scripts/docker/bake-inputs-changed.mjs`). A pin PR changes no
  input of the pinned image, so its tag stays on the pinned digest.
- `RUNTIME_IMAGE` is an input of `n8nio/node-pc`. So the pin PR of a new base
  is also the inputs PR of `node-pc`, and the `-pc` images need a third PR.
- Master compares each push with the commit before it. If the publish run of
  an inputs PR fails, re-run that run. A later push does not publish it again.
- A change to a publish workflow alone builds on the PR, but master does not
  publish. To publish it, dispatch the workflow on master with `push` enabled.
  Use the same dispatch to rebuild an image without an input change, for
  example to get patched OS packages. Then pin the new digest.

### Example: a new Node version

1. Change `DHI_REF` and `DEBIAN_DHI_REF`. Merge. Master publishes the bases.
2. Change `NODE_VERSION`, `BUILDER_IMAGE` and `DEBIAN_BUILDER_IMAGE`, and pin
   `RUNTIME_IMAGE` and `DEBIAN_RUNTIME_IMAGE`. Merge. Master publishes
   `n8nio/node-pc`.
3. Pin `PC_BUILDER_IMAGE` and `PC_RUNTIME_IMAGE`.

Other pins (`node`, `python`, `alpine`, distroless, DHI) are third-party
images. Change them in one PR. A DHI ref change is also an inputs PR for the
bases.
