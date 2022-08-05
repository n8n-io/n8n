# 1. Create an image to build n8n
FROM node:16-alpine as builder

# Update everything and install needed dependencies
USER root

# Install all needed dependencies
RUN apk --update add --virtual build-dependencies python3 build-base ca-certificates && \
	npm_config_user=root npm install -g lerna run-script-os

WORKDIR /data

COPY lerna.json .
COPY package.json .
COPY package-lock.json .
COPY packages/cli/ ./packages/cli/
COPY packages/core/ ./packages/core/
COPY packages/design-system/ ./packages/design-system/
COPY packages/editor-ui/ ./packages/editor-ui/
COPY packages/nodes-base/ ./packages/nodes-base/
COPY packages/workflow/ ./packages/workflow/
RUN rm -rf node_modules packages/*/node_modules packages/*/dist

RUN npm config set legacy-peer-deps true
RUN npm install --production --loglevel notice
RUN lerna bootstrap --hoist -- --production
RUN npm run build


# 2. Start with a new clean image with just the code that is needed to run n8n
FROM node:16-alpine

USER root

RUN apk add --update graphicsmagick tzdata tini su-exec git

WORKDIR /data

# Install all needed dependencies
RUN npm_config_user=root npm install -g full-icu

# Install fonts
RUN apk --no-cache add --virtual fonts msttcorefonts-installer fontconfig && \
	update-ms-fonts && \
	fc-cache -f && \
	apk del fonts && \
	find  /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \;

ENV NODE_ICU_DATA /usr/local/lib/node_modules/full-icu

COPY --from=builder /data ./

COPY docker/images/n8n-custom/docker-entrypoint.sh /docker-entrypoint.sh
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

EXPOSE 5678/tcp
