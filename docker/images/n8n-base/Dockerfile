ARG NODE_VERSION=20

# 1. Use a builder step to download various dependencies
FROM node:${NODE_VERSION}-alpine AS builder

# Install fonts
RUN	\
	apk --no-cache add --virtual fonts msttcorefonts-installer fontconfig && \
	update-ms-fonts && \
	fc-cache -f && \
	apk del fonts && \
	find  /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \;

# Install git and other OS dependencies
RUN apk add --update git openssh graphicsmagick tini tzdata ca-certificates libc6-compat jq

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    # Also install ffmpeg for media processing
    apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
# Update npm and install full-uci
COPY .npmrc /usr/local/etc/npmrc
RUN npm install -g corepack@0.31 full-icu@1.5.0

# Activate corepack, and install pnpm
WORKDIR /tmp
COPY package.json ./
RUN corepack enable && corepack prepare --activate

# Cleanup
RUN	rm -rf /lib/apk/db /var/cache/apk/ /tmp/* /root/.npm /root/.cache/node /opt/yarn*

# 2. Start with a new clean image and copy over the added files into a single layer
FROM node:${NODE_VERSION}-alpine
COPY --from=builder / /

# Delete this folder to make the base image backward compatible to be able to build older version images
RUN rm -rf /tmp/v8-compile-cache*

WORKDIR /home/node
ENV NODE_ICU_DATA=/usr/local/lib/node_modules/full-icu
EXPOSE 5678/tcp
