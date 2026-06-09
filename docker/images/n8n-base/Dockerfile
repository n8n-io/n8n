ARG NODE_VERSION=24.15.0

# Pinned to multi-arch index digest (linux/amd64 + linux/arm64) for reproducible builds.
# Bump the digest together with the tag when updating the base image.
FROM node:24.15.0-alpine3.22@sha256:b689d4005875ae167178471a7a622ec2909459a3bbb32277260be1971af7a99f

ARG NODE_VERSION

# Install all dependencies in a single layer to minimize image size
RUN apk add --no-cache busybox-binsh && \
    # Install fonts
    apk --no-cache add --virtual .build-deps-fonts msttcorefonts-installer fontconfig && \
    for i in 1 2 3; do update-ms-fonts && break; echo "update-ms-fonts attempt $i failed, retrying..."; sleep 5; done && \
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
EXPOSE 5678/tcp
