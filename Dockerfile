FROM node:14.15-alpine as builder

USER root

RUN apk --update add --virtual build-dependencies python build-base ca-certificates && \
	npm_config_user=root npm install -g lerna

WORKDIR /data

COPY lerna.json .
COPY package.json .
COPY packages/cli/ ./packages/cli/
COPY packages/core/ ./packages/core/
COPY packages/design-system/ ./packages/design-system/
COPY packages/editor-ui/ ./packages/editor-ui/
COPY packages/nodes-base/ ./packages/nodes-base/
COPY packages/workflow/ ./packages/workflow/
RUN rm -rf node_modules packages/*/node_modules packages/*/dist

RUN npm install --production --loglevel notice
RUN lerna bootstrap --hoist -- --production
RUN npm run build


FROM node:14.15-alpine

USER root

RUN apk add --update graphicsmagick tzdata tini su-exec git

WORKDIR /data

RUN npm_config_user=root npm install -g full-icu

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

CMD ["npm run start"]