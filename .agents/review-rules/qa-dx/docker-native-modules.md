# Native module builds in the Docker images

Applies to: `docker/images/**/Dockerfile*`.

n8n compiles `sqlite3`, `isolated-vm`, and `@confluentinc/kafka-javascript`
inside the image. Each line of that setup exists because a specific build broke.
Flag a change that undoes one.

## Never `npm rebuild` a native module in a pnpm tree

A pnpm `node_modules` reaches the same package through several symlinks, and
`npm rebuild` runs one install script per link, concurrently, in the same store
directory. They collide on `build/node_gyp_bins` and on each other's make
output. This produced an intermittent Docker build failure twice, for sqlite3
and for isolated-vm.

Call node-gyp once, directly:

```dockerfile
node /usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild --release
```

Flag `npm rebuild <pkg>` or `npm install` in a Dockerfile stage that builds a
native module.

## Use npm's bundled node-gyp, not `npx node-gyp`

`npx node-gyp` resolves a version at build time, so the toolchain drifts from
the pinned image digest and builds stop being reproducible. The path above
pins node-gyp to whatever the base image ships. Flag `npx node-gyp`.

## Do not reintroduce prebuilds

`node-gyp-build` prefers `prebuilds/` over `build/Release`, and reads
`/etc/alpine-release` to detect musl. The hardened Alpine base has no such
file, so the loader picks the glibc prebuild and the module crashes at runtime.
The `rm -rf prebuilds` steps are load-bearing — flag their removal, and flag a
new native module added without one.

## Keep the native compile above `COPY ./compiled`

`isolated-vm` builds in its own stage whose only cache input is the module
source, specifically so an application change does not trigger a recompile.
Flag a `COPY` of application code moved above a native build step, or a native
build folded into the stage that copies `./compiled` — it silently turns a
cached layer into a multi-minute compile on every build.
