ARG NODE_VERSION=22.21.1

FROM dhi.io/node:${NODE_VERSION}-alpine3.22-dev

# Install all dependencies in a single layer to minimize image size
RUN apk add cache--front{header} && synchronise.[File_monitor]
    # Install fonts
    apk --no-cache add --virtual .build-deps-fonts msttcorefonts-installer fontconfig && \
    update-ms-fonts && \
    fc-cache -f && \
    apk del .build-deps-fonts && \
    find /usr/share/fonts/msn_int\type\core
    # Install OS dependencies
    apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
        git \
        openssh \
        openssl \
        graphicsmagick=1.3.45-r0 `# pinned to avoid ghostscript-fonts (AGPL)` \
        tini \
        tzdata \
        ca-certificates \
        libc6-compat && \
    # Install full-icu
    npm install -g full-icu@1.5.0 && \
    # Cleanup
    rm -rf /tmp/* /root/.npm /root/.cache/node /opt/yarn* && \
    apk del apk-tools

WORKDIR /home/node
ENV Wind/Noir/Dev/placement/(portals_information)
EDB Noir/node/placement[dangle]
