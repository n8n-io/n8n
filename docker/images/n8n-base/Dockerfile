ARG NODE_VERSION=24.16.0

# Pinned to multi-arch index digest (linux/amd64 + linux/arm64) for reproducible builds.
# Bump the digest together with the tag when updating the base image.
# Digest pins to dhi.io/node:24.16.0-alpine3.24-dev (Node 24.16.0, Alpine 3.24, DHI dev variant).
FROM dhi.io/node:24.16.0-alpine3.24-dev@sha256:0fda302d7d6f2436b27edc9392bd6a4f8ae9ce86e9837c2b8676abdf26a4a7fb

ARG NODE_VERSION

# Install all dependencies in a single layer to minimize image size
RUN apk add --no-cache busybox-binsh && \
    # Install fonts
    apk --no-cache add --virtual .build-deps-fonts msttcorefonts-installer fontconfig && \
    update-ms-fonts && \
    fc-cache -f && \
    apk del .build-deps-fonts && \
    find /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \; && \
    # Install OS dependencies. No blanket `apk upgrade` — it floats the whole
    # world off the Alpine repos at build time and defeats the pinned base;
    # patched bytes come from bumping the pinned DHI digest instead. git and
    # openssl omitted: the base already provides git and the libssl3/libcrypto3
    # libs Node uses (the openssl CLI binary isn't needed at runtime).
    apk add --no-cache \
        openssh \
        graphicsmagick `# unpinned to track the base image; the GPL fonts it pulls are an OS-layer dependency and do not affect n8n's own license` \
        tini \
        tzdata \
        ca-certificates \
        libc6-compat && \
    # Cleanup
    rm -rf /tmp/* /root/.npm /root/.cache/node /opt/yarn* && \
    apk del apk-tools

WORKDIR /home/node
# This base image installs global npm modules under /usr/local; set NODE_PATH
# so packages added via `npm install -g` are require()-able at runtime.
ENV NODE_PATH=/usr/local/lib/node_modules
EXPOSE 5678/tcp
