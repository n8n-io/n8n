ARG NODE_VERSION=24.15.0

FROM dhi.io/node:${NODE_VERSION}-alpine3.23-dev

ARG NODE_VERSION

# Install all dependencies in a single layer to minimize image size.
# DHI's alpine3.23-dev base already provides /bin/sh (via its bundled busybox)
# and git; we don't reinstall them. Reinstalling busybox-binsh from alpine
# community pins it to a busybox release that conflicts with DHI's git
# snapshot version, breaking the build whenever alpine bumps the rebuild.
RUN apk --no-cache add --virtual .build-deps-fonts msttcorefonts-installer fontconfig && \
    update-ms-fonts && \
    fc-cache -f && \
    apk del .build-deps-fonts && \
    find /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \; && \
    # Install OS dependencies (git is already in the DHI base). `apk upgrade`
    # is intentionally omitted: DHI ships vetted pinned versions, and trying
    # to upgrade can race with alpine repo refreshes (e.g. libssl3 bumped
    # without a matching openssl rebuild) and break the build.
    apk add --no-cache \
        openssh \
        openssl \
        graphicsmagick=1.3.46-r0 `# pinned for build reproducibility` \
        tini \
        tzdata \
        ca-certificates \
        libc6-compat && \
    # Cleanup
    rm -rf /tmp/* /root/.npm /root/.cache/node /opt/yarn* && \
    apk del apk-tools

WORKDIR /home/node
# npm prefix -g is /usr/local but node's built-in search path is /usr/lib/node_modules.
# Bridge the two so users extending this image with `RUN npm install -g <pkg>` can
# `require(<pkg>)` from a Function/Code node at runtime (gh #24191).
ENV NODE_PATH=/usr/local/lib/node_modules
EXPOSE 5678/tcp
