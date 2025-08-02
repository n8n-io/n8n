ARG NODE_VERSION=22

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

# Install essential OS dependencies with pinned versions
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" >> /etc/apk/repositories && \
    apk update && \
    apk upgrade && \
    apk add --no-cache \
        git=2.50.1-r0 \
        openssh=10.0_p1-r7 \
        openssl=3.5.1-r0 \
        graphicsmagick=1.3.45-r0 \
        tini=0.19.0-r3 \
        tzdata=2025b-r0 \
        ca-certificates=20241121-r2 \
        libc6-compat=1.1.0-r4 \
        jq=1.8.0-r0

# Update npm, install full-icu and npm@11.4.2 to fix brace-expansion vulnerability
# Remove npm update after vulnerability is fixed in in node image
RUN npm install -g full-icu@1.5.0 npm@11.4.2

RUN rm -rf /tmp/* /root/.npm /root/.cache/node /opt/yarn* && \
  apk del apk-tools

# ==============================================================================
# STAGE 2: Final Base Runtime Image
# ==============================================================================
FROM node:${NODE_VERSION}-alpine

COPY --from=builder / /

WORKDIR /home/node
ENV NODE_ICU_DATA=/usr/local/lib/node_modules/full-icu
EXPOSE 5678/tcp
