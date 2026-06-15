ARG NODE_VERSION=24.16.0

# Pinned to multi-arch index digest (linux/amd64 + linux/arm64) for reproducible builds.
# Bump the digest together with the tag when updating the base image.
# Digest pins to dhi.io/node:24.16.0-alpine3.22-dev (Node 24.16.0, Alpine 3.22, DHI dev variant).
FROM dhi.io/node:24.16.0-alpine3.22-dev@sha256:67906dda1e458153488aecb9a7a5a926cb03cf1e8890eb8602a86a78162b2556

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
        graphicsmagick=1.3.45-r0 `# pinned to avoid ghostscript-fonts (GPL-2.0); see SEC-398 + NODE-4184` \
        tini \
        tzdata \
        ca-certificates \
        libc6-compat && \
    # Cleanup
    rm -rf /tmp/* /root/.npm /root/.cache/node /opt/yarn* && \
    apk del apk-tools

WORKDIR /home/node
# DHI images use a non-standard global npm path, so we need to set NODE_PATH
# to allow externally installed npm packages to be found by require()
ENV NODE_PATH=/opt/nodejs/node-v${NODE_VERSION}/lib/node_modules
EXPOSE 5678/tcp
