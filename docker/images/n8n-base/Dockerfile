ARG NODE_VERSION=16
FROM node:${NODE_VERSION}-alpine

WORKDIR /home/node
COPY .npmrc /usr/local/etc/npmrc

RUN \
	apk add --update graphicsmagick tini tzdata ca-certificates && \
	npm install -g npm@latest full-icu && \
	rm -rf /var/cache/apk/* /root/.npm /tmp/* && \
	# Install fonts
	apk --no-cache add --virtual fonts msttcorefonts-installer fontconfig && \
	update-ms-fonts && \
	fc-cache -f && \
	apk del fonts && \
	find  /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \; && \
	rm -rf /var/cache/apk/* /tmp/*

ENV NODE_ICU_DATA /usr/local/lib/node_modules/full-icu
EXPOSE 5678/tcp
