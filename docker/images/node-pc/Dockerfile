# check=skip=InvalidDefaultArgInFrom
# Node.js compiled from source, with the V8 patches in ./patches applied.
#
# Three images build from this file:
#   node-pc         - Node 26 with V8 pointer compression, for the n8n `-pc`
#                     image variant. No official pointer-compressed Node
#                     binaries exist (nodejs.org publishes none, and Docker Hub
#                     node images are stock).
#   node-patched-24 - stock-configured Node 24 for the 1.x image, so that the
#                     1.x line also runs a Node whose V8 we control.
#   node-patched-26 - stock-configured Node 26 for the release images.
#
# All follow the source-build path of the official docker-node Alpine recipe.
# The build applies the V8 patches in ./patches: upstream V8 fixes that Node
# has not backported to the release line yet. The patch count becomes the
# -n8n.N suffix of the V8 version, and check-v8-patches.js proves that the
# compiled Node carries the patches and the expected configure flags.
#
# Publishes the `dev` target per image: plain Alpine with our compiled Node,
# npm, and headers under /usr/local. The n8n image builds native addons in this
# image and copies /usr/local/bin and /usr/local/lib onto n8nio/base, so OS base
# refreshes do not recompile Node.
#
# The node-pc and node-patched-* targets in docker/docker-bake.hcl set these.
# Do not use plain `docker build`.
ARG NODE_VERSION
ARG ALPINE_IMAGE
ARG ENABLE_POINTER_COMPRESSION=true
# Compiling V8 needs 1.5-2 GB of memory per parallel job. Lower this on
# builders whose memory-to-core ratio cannot cover all cores.
ARG MAKE_JOBS=

FROM ${ALPINE_IMAGE} AS builder
ARG NODE_VERSION
ARG MAKE_JOBS
ARG ENABLE_POINTER_COMPRESSION

COPY docker/images/node-pc/patches/ /patches/
RUN case "$ENABLE_POINTER_COMPRESSION" in true|false) ;; *) echo "ENABLE_POINTER_COMPRESSION must be true or false, got '$ENABLE_POINTER_COMPRESSION'" && exit 1;; esac \
    && apk add --no-cache --virtual .build-deps \
        binutils-gold \
        curl \
        g++ \
        gcc \
        gnupg \
        libgcc \
        linux-headers \
        make \
        patch \
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
    # dirmngr exits asynchronously and can unlink S.dirmngr mid-rm on BusyBox.
    && { rm -rf "$GNUPGHOME" || { sleep 1 && rm -rf "$GNUPGHOME"; }; } \
    && grep " node-v$NODE_VERSION.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
    && tar -xf "node-v$NODE_VERSION.tar.xz" \
    && cd "node-v$NODE_VERSION" \
    && for p in /patches/*.patch; do patch -p1 -N -d deps/v8 -i "$p" || exit 1; done \
    # Mark the patched V8 in process.versions.v8 with the patch count,
    # e.g. 14.6.202.34-node.40-n8n.1
    && n=$(ls /patches/*.patch | wc -l) \
    && sed -i "s/^\([[:space:]]*'v8_embedder_string': '-node\.[0-9]*\)'/\1-n8n.$n'/" common.gypi \
    && grep -q "n8n\.$n'" common.gypi \
    && ./configure $([ "$ENABLE_POINTER_COMPRESSION" = true ] && echo --experimental-enable-pointer-compression) \
    && make -j"${MAKE_JOBS:-$(getconf _NPROCESSORS_ONLN)}" V= \
    && make install DESTDIR=/node-install \
    # Remove unused OpenSSL headers to save ~34MB. See https://github.com/nodejs/node/issues/46451
    && find /node-install/usr/local/include/node/openssl/archs -mindepth 1 -maxdepth 1 ! -name "$OPENSSL_ARCH" -exec rm -rf {} \;

# Remove this override when Node 26 bundles brace-expansion 5.0.12 or later.
RUN set -eu; \
    if [ "${NODE_VERSION%%.*}" != 26 ]; then exit 0; fi; \
    cd /node-install/usr/local/lib/node_modules/npm/node_modules; \
    needs_update=$(/node-install/usr/local/bin/node -p \
        "require('./semver').lt(require('./brace-expansion/package.json').version, '5.0.12')"); \
    if [ "$needs_update" = false ]; then exit 0; fi; \
    archive=/tmp/brace-expansion.tgz; \
    curl -fsSL https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.12.tgz -o "$archive"; \
    echo "ef8448ec78f20b692f04fa6d01f39b5ab34c66404bea3429f5a39c6c9e0be8b4  $archive" | sha256sum -c -; \
    rm -rf brace-expansion; \
    mkdir brace-expansion; \
    tar -xzf "$archive" --strip-components=1 -C brace-expansion; \
    rm "$archive"

FROM ${ALPINE_IMAGE} AS base
ARG ENABLE_POINTER_COMPRESSION

RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && apk add --no-cache libstdc++
COPY --from=builder /node-install/usr/local /usr/local
COPY docker/images/node-pc/check-v8-patches.js /tmp/check-v8-patches.js
RUN node --version && npm --version \
    && node /tmp/check-v8-patches.js && rm /tmp/check-v8-patches.js

FROM base AS dev
# node-gyp must compile native addons against this build's headers so they pick
# up this build's defines (e.g. pointer compression), never against downloaded
# stock headers.
ENV npm_config_nodedir=/usr/local
