ARG NODE_VERSION=24.15.0

# Pinned to multi-arch index digest (linux/amd64 + linux/arm64) for reproducible builds.
# Bump the digest together with the tag when updating the base image.
FROM dhi.io/node:24.15.0-alpine3.22-dev@sha256:a7eead704e9bd2d7a4c1b52cf595848f180365eba7c15a185ce1c3a690c1a19d

ARG NODE_VERSION

# Install all dependencies in a single layer to minimize image size
RUN apk add --no-cache busybox-binsh && \
    # Install fonts
    apk --no-cache add --virtual .build-deps-fonts msttcorefonts-installer fontconfig && \
    update-ms-fonts && \
    fc-cache -f && \
    apk del .build-deps-fonts && \
    find /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \; && \
    # Install OS dependencies
    apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
        git \
        openssh \
        openssl \
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
