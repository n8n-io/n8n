# Code sandbox image (spike): the code daemon of the sandbox service plus the
# JS runtime (@n8n/code-runtime) and the Python runtime
# (@n8n/code-runtime-python). The sandbox service runner starts it for code
# sandboxes (SANDBOX_RUNNER_DOCKER_CODE_IMAGE). The create request selects the
# runtime (n8n-js or n8n-py), so one image serves both languages.
#
# Build: see build.sh in this folder. It needs two inputs:
#   - ./dist/code-runtime: `pnpm deploy` output of @n8n/code-runtime
#   - the build context "sandbox-service": a checkout of n8n-sandbox-service
#
# Spec: same Node and Alpine as the n8nio/runners image (26.7.0, alpine3.24).
# Deviation: Node 26.7.0 aborts in `node --build-snapshot` on this runtime
# (std::length_error, also on Debian; it comes from loading n8n-workflow).
# Node 24 builds the snapshot. NODE_IMAGE selects the base image.
ARG NODE_IMAGE=node:24-alpine3.22
# Python: same minor version as the n8nio/runners image (3.13), on the Alpine
# version of NODE_IMAGE, so the binaries run on the same musl.
ARG PYTHON_IMAGE=python:3.13-alpine3.22

# ==============================================================================
# STAGE 1: code daemon (static Go binary, runs on musl)
# ==============================================================================
FROM golang:1.25-alpine AS daemon-builder
WORKDIR /src
COPY --from=sandbox-service go.mod go.sum ./
RUN go mod download
COPY --from=sandbox-service cmd ./cmd
COPY --from=sandbox-service internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/code-daemon ./cmd/code-daemon

# ==============================================================================
# STAGE 2: JS runtime bundle (`pnpm deploy` output, includes moment)
# ==============================================================================
FROM ${NODE_IMAGE} AS runtime-builder
COPY ./dist/code-runtime /opt/n8n-code-runtime
# pnpm's own files point at patch files that only exist in the checkout.
RUN rm -f /opt/n8n-code-runtime/pnpm-workspace.yaml /opt/n8n-code-runtime/pnpm-lock.yaml \
    /opt/n8n-code-runtime/node_modules/.pnpm-workspace-state-v1.json

# ==============================================================================
# STAGE 3: Python (the official image, without pip and the test packages)
# ==============================================================================
FROM ${PYTHON_IMAGE} AS python
RUN rm -rf /usr/local/lib/python3.13/ensurepip /usr/local/lib/python3.13/idlelib \
        /usr/local/lib/python3.13/tkinter /usr/local/lib/python3.13/turtledemo \
        /usr/local/lib/python3.13/site-packages/pip* \
    # The official image has no .pyc files. Without them, each Python process
    # compiles the modules it imports (-B stops it from writing them).
    && python3 -m compileall -q -j 0 /usr/local/lib/python3.13

# ==============================================================================
# STAGE 4: final image
# ==============================================================================
FROM ${NODE_IMAGE}
ARG N8N_VERSION=snapshot

COPY --from=python /usr/local/bin/python3.13 /usr/local/bin/python3.13
COPY --from=python /usr/local/lib/python3.13 /usr/local/lib/python3.13
COPY --from=python /usr/local/lib/libpython3.13.so.1.0 /usr/local/lib/libpython3.13.so.1.0
COPY packages/@n8n/code-runtime-python/src /opt/n8n-code-runtime-python

RUN ln -s python3.13 /usr/local/bin/python3 \
    # The shared libraries that Python needs, found the same way as in the
    # official Python image.
    && apk add --no-cache --virtual .scan-deps pax-utils \
    && deps="$(scanelf --needed --nobanner --format '%n#p' --recursive /usr/local/lib/python3.13 \
        /usr/local/bin/python3.13 /usr/local/lib/libpython3.13.so.1.0 \
        | tr ',' '\n' | sort -u \
        | awk 'system("[ -e /usr/local/lib/" $1 " ]") == 0 { next } { print "so:" $1 }')" \
    && apk add --no-cache tzdata $deps \
    && apk del .scan-deps \
    && python3 -m compileall -q /opt/n8n-code-runtime-python \
    && python3 -c "import ssl, sqlite3, ctypes, lzma, bz2, decimal, zoneinfo, json, uuid" \
    && apk add --no-cache tini ca-certificates \
    # No package manager and no npm in the sandbox.
    && rm -rf /sbin/apk /etc/apk /lib/apk /usr/share/apk /var/cache/apk \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
        /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn-* \
        /usr/local/bin/yarn /usr/local/bin/yarnpkg \
    # no-new-privileges makes setuid binaries inert. Clear the bits anyway.
    && find / -xdev -perm /4000 -type f -exec chmod u-s {} +

COPY --from=daemon-builder /out/code-daemon /usr/local/bin/code-daemon
COPY --from=runtime-builder /opt/n8n-code-runtime /opt/n8n-code-runtime

# Two ways to start a worker:
# - n8n-js: from a V8 startup snapshot of the bundled runtime. The modules are
#   already in the heap, so a worker starts in a few tens of milliseconds.
# - n8n-js-nosnapshot: loads the modules, with a warm V8 compile cache.
# Both are built with the Node binary of this image, which must match.
RUN node --snapshot-blob /opt/n8n-code-runtime/snapshot.blob \
        --build-snapshot /opt/n8n-code-runtime/dist/snapshot-bundle.js 2>/dev/null \
    && node -e "require('node:module').enableCompileCache('/opt/n8n-code-runtime/.compile-cache'); \
        require('/opt/n8n-code-runtime/dist/run-task.js'); require('node:module').flushCompileCache()"

# The runtime registry. The daemon replaces {taskMemoryMb} (memory of the
# process) and {memoryPerTaskMb} (memory of one task). n8n-py runs each task in
# a child process also in reuse mode, so it limits each child.
RUN mkdir -p /etc/code-runtime \
    && printf '{"n8n-js":{"version":"%s","command":["node","--snapshot-blob","/opt/n8n-code-runtime/snapshot.blob","--max-old-space-size={taskMemoryMb}","/opt/n8n-code-runtime"]},"n8n-js-nosnapshot":{"version":"%s","command":["node","--max-old-space-size={taskMemoryMb}","/opt/n8n-code-runtime/dist/entry.js"]},"n8n-py":{"version":"%s","command":["python3","-I","-B","/opt/n8n-code-runtime-python/worker.py","--task-memory-mb","{memoryPerTaskMb}","--kill-strays"]}}\n' \
        "${N8N_VERSION}" "${N8N_VERSION}" "${N8N_VERSION}" > /etc/code-runtime/runtimes.json \
    && mkdir -p /work && chown 1000:1000 /work

# uid 1000 is the "node" user of the base image. The runner also sets --user 1000:1000.
USER 1000:1000
ENV HOME=/home/node
WORKDIR /work
EXPOSE 8081

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/code-daemon"]
