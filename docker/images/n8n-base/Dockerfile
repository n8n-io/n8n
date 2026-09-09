# CI passes one DHI reference per published Node version (see the matrix in
# build-base-image.yml). The default keeps plain `docker build` working.
ARG DHI_REF=dhi.io/node:24.19.0-alpine3.24-dev@sha256:dc2989ad23938772abaf549ed7bde5d61d70377005229bb55bef94bff40f8bbd
FROM ${DHI_REF}

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
        libc6-compat \
        librdkafka && \
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
