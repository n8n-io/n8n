# Node.js compiled with V8 pointer compression, for the n8n `-pc` image variant.
#
# No official pointer-compressed Node binaries exist (nodejs.org publishes none,
# and Docker Hub node images are stock), so this image compiles Node from the
# GPG-verified source tarball, following the source-build path of the official
# docker-node Alpine recipe with one added configure flag.
#
# Two published targets:
#   runtime (default) - drop-in sibling of n8nio/base, layered on the same DHI
#                       base with our compiled Node swapped in
#   dev               - plain Alpine with apk usable, for the n8n builder
#                       stage, which must compile native addons against this
#                       Node's headers
ARG NODE_VERSION=26.5.1
# Compiling V8 needs 1.5-2 GB of memory per parallel job. Lower this on
# builders whose memory-to-core ratio cannot cover all cores.
ARG MAKE_JOBS=

# Pinned to a multi-arch index digest (linux/amd64 + linux/arm64) for reproducible builds.
# Bump the tag and digest together when updating.
FROM alpine:3.24@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b AS builder
ARG NODE_VERSION
ARG MAKE_JOBS

RUN apk add --no-cache --virtual .build-deps \
        binutils-gold \
        curl \
        g++ \
        gcc \
        gnupg \
        libgcc \
        linux-headers \
        make \
        python3 \
        py-setuptools \
        rust \
        cargo \
    && OPENSSL_ARCH= && alpineArch="$(apk --print-arch)" \
    && case "${alpineArch##*-}" in \
        x86_64) OPENSSL_ARCH=linux-x86_64;; \
        aarch64) OPENSSL_ARCH=linux-aarch64;; \
        *) echo "unsupported architecture: $alpineArch" && exit 1;; \
    esac \
    && export GNUPGHOME="$(mktemp -d)" \
    # gpg keys listed at https://github.com/nodejs/node#release-keys
    && for key in \
        5BE8A3F6C8A5C01D106C0AD820B1A390B168D356 \
        DD792F5973C6DE52C432CBDAC77ABFA00DDBF2B7 \
        CC68F5A3106FF448322E48ED27F5E38D5B0A215F \
        8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 \
        890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4 \
        C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C \
        108F52B48DB57BB0CC439B2997B01419BD92F80A \
        A363A499291CBBC940DD62E41F10027AF002F8B0 \
        655F3B5C1FB3FA8D1A0CA6BDE4A7D232B936D2FD \
    ; do \
        { gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$key" && gpg --batch --fingerprint "$key"; } || \
        { gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key" && gpg --batch --fingerprint "$key"; } ; \
    done \
    && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION.tar.xz" \
    && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
    && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
    && gpgconf --kill all \
    && rm -rf "$GNUPGHOME" \
    && grep " node-v$NODE_VERSION.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
    && tar -xf "node-v$NODE_VERSION.tar.xz" \
    && cd "node-v$NODE_VERSION" \
    && ./configure --experimental-enable-pointer-compression \
    && make -j"${MAKE_JOBS:-$(getconf _NPROCESSORS_ONLN)}" V= \
    && make install DESTDIR=/node-install \
    # Remove unused OpenSSL headers to save ~34MB. See https://github.com/nodejs/node/issues/46451
    && find /node-install/usr/local/include/node/openssl/archs -mindepth 1 -maxdepth 1 ! -name "$OPENSSL_ARCH" -exec rm -rf {} \;

FROM alpine:3.24@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b AS base

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache libstdc++
COPY --from=builder /node-install/usr/local /usr/local
RUN node --version && npm --version \
    && node -e "if (!process.config.variables.v8_enable_pointer_compression) { throw new Error('pointer compression is not enabled') }"

FROM base AS dev
# node-gyp must compile native addons against this build's headers so they pick
# up the pointer compression defines, never against downloaded stock headers.
ENV npm_config_nodedir=/usr/local

# ---------------------------------------------------------------------------

# Runtime layers on the same DHI base as n8n-base, so both siblings share
# Docker's OS-layer patching and attestations. Only the Node binary is ours:
# DHI's stock Node (at /usr/bin on Alpine) is removed and replaced by the
# pointer-compressed build.
# Pinned to a multi-arch index digest (linux/amd64 + linux/arm64) for reproducible builds.
# Bump the tag and digest together when updating.
FROM dhi.io/node:26.5.1-alpine3.24-dev@sha256:c4062f85acd1ca91ffb7d15048dcc5f15a922d630e65eb3c3c0dcdcef6ea36d8 AS runtime

RUN rm -f /usr/bin/node /usr/bin/nodejs /usr/bin/npm /usr/bin/npx /usr/bin/corepack
COPY --from=builder /node-install/usr/local /usr/local
RUN node --version \
    && node -e "if (!process.config.variables.v8_enable_pointer_compression) { throw new Error('pointer compression is not enabled') }"

# Mirrors docker/images/n8n-base/Dockerfile so the n8n runtime stage can swap
# between the two.
RUN apk add --no-cache busybox-binsh && \
    apk --no-cache add --virtual .build-deps-fonts msttcorefonts-installer fontconfig && \
    update-ms-fonts && \
    fc-cache -f && \
    apk del .build-deps-fonts && \
    find /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \; && \
    # No blanket `apk upgrade` — patched bytes come from bumping the pinned
    # DHI digest instead, same policy as n8n-base.
    apk add --no-cache \
        openssh \
        graphicsmagick \
        tini \
        tzdata \
        ca-certificates \
        libc6-compat && \
    rm -rf /tmp/* /root/.npm /root/.cache/node /opt/yarn* && \
    apk del apk-tools

# The compiled build lives at /usr/local/bin, which is what the cloud launch
# and AppArmor profile expect. Keep the stock /usr/bin path working for
# anything that references it.
RUN ln -sf /usr/local/bin/node /usr/bin/node

WORKDIR /home/node
ENV NODE_PATH=/usr/local/lib/node_modules
EXPOSE 5678/tcp
