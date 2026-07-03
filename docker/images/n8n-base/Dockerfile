# Pinned to a multi-arch index digest (linux/amd64 + linux/arm64) for reproducible builds.
# The tag is the human-readable version; Docker resolves by the digest. Bump the tag and
# digest together when updating the base image.
FROM dhi.io/node:24.16.0-alpine3.24-dev@sha256:0fda302d7d6f2436b27edc9392bd6a4f8ae9ce86e9837c2b8676abdf26a4a7fb

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
        graphicsmagick \
        tini \
        tzdata \
        ca-certificates \
        libc6-compat && \
    # Cleanup
    rm -rf /tmp/* /root/.npm /root/.cache/node /opt/yarn* && \
    apk del apk-tools

# Alpine 3.24 ships node at /usr/bin; symlink it to /usr/local/bin so the path
# matches what the cloud launch and AppArmor profile expect.
RUN mkdir -p /usr/local/bin && ln -sf /usr/bin/node /usr/local/bin/node

WORKDIR /home/node
# This base image installs global npm modules under /usr/local; set NODE_PATH
# so packages added via `npm install -g` are require()-able at runtime.
ENV NODE_PATH=/usr/local/lib/node_modules
EXPOSE 5678/tcp
