ARG NODE_VERSION=22.21.0

# ==============================================================================
# STAGE 1: Builder for Base Dependencies
# ==============================================================================
FROM node:${NODE_VERSION}-alpine AS builder

# Install fonts
RUN \
  apk --no-cache add --virtual .build-deps-fonts msttcorefonts-installer fontconfig && \
  update-ms-fonts && \
  fc-cache -f && \
  apk del .build-deps-fonts && \
  find /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \;

# Install essential OS dependencies
RUN echo "https://dl-cdn.alpinelinux.org/alpine/v3.22/main" >> /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/v3.22/community" >> /etc/apk/repositories && \
    apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache libxml2 && \
    apk add --no-cache \
        git \
        openssh \
        openssl \
        graphicsmagick \
        tini \
        tzdata \
        ca-certificates \
<<<<<<< HEAD
        libc6-compat \
        jq

# Install full-icu
RUN npm install -g full-icu@1.5.0

RUN rm -rf /tmp/* /root/.npm /root/.cache/node /opt/yarn* && \
  apk del apk-tools

# ==============================================================================
# STAGE 2: Final Base Runtime Image
# ==============================================================================
FROM node:${NODE_VERSION}-alpine

COPY --from=builder / /
=======
        libc6-compat && \
    # Install full-icu
    npm install -g full-icu@1.5.0 && \
    # Update npm bundled deps: diff@8.0.3, tar@7.5.4
    # TODO: Remove when fixed upstream in npm
    cd $(npm root -g)/npm/node_modules && \
    rm -rf diff && \
    wget -qO- https://registry.npmjs.org/diff/-/diff-8.0.3.tgz | tar -xz && mv package diff && \
    rm -rf tar && \
    wget -qO- https://registry.npmjs.org/tar/-/tar-7.5.4.tgz | tar -xz && mv package tar && \
    # Cleanup
    rm -rf /tmp/* /root/.npm /root/.cache/node /opt/yarn* && \
    apk del apk-tools
>>>>>>> 993228ad (chore: Bump up dependencies (#24886))

WORKDIR /home/node
ENV NODE_ICU_DATA=/usr/local/lib/node_modules/full-icu
EXPOSE 5678/tcp
