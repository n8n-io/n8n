ARG NODE_VERSION=18
FROM n8nio/base:${NODE_VERSION} as builder

ARG N8N_VERSION
RUN if [ -z "$N8N_VERSION" ] ; then echo "The N8N_VERSION argument is missing!" ; exit 1; fi

RUN set -eux; \
	apk --no-cache add --virtual build-dependencies python3 build-base && \
	npm install -g --omit=dev n8n@${N8N_VERSION} && \
	apk del build-dependencies build-base  && \
	rm -rf /usr/local/lib/node_modules/n8n/node_modules/@n8n/chat && \
	rm -rf /usr/local/lib/node_modules/n8n/node_modules/n8n-design-system && \
	rm -rf /usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/node_modules && \
	find /usr/local/lib/node_modules/n8n -type f -name "*.ts" -o -name "*.js.map" -o -name "*.vue" | xargs rm -f && \
	rm -rf /root/.npm

# Final clean image
FROM n8nio/base:${NODE_VERSION}
COPY --from=builder /usr/local/lib/node_modules/n8n /usr/local/lib/node_modules/n8n
RUN ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n

COPY docker-entrypoint.sh /

RUN \
	mkdir .n8n && \
	chown node:node .n8n

ENV N8N_VERSION=${N8N_VERSION}
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=stable

USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
