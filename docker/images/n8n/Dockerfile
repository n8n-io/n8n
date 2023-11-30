ARG NODE_VERSION=18
FROM n8nio/base:${NODE_VERSION}

ARG N8N_VERSION
RUN if [ -z "$N8N_VERSION" ] ; then echo "The N8N_VERSION argument is missing!" ; exit 1; fi

ENV N8N_VERSION=${N8N_VERSION}
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=stable
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN wget -qO- "https://raw.githubusercontent.com/n8n-io/n8n/n8n@${N8N_VERSION}/packages/cli/package.json" > ./cli_package.json

RUN apk add --update jq
RUN corepack enable
RUN set -eux; \
	apkArch="$(apk --print-arch)"; \
	case "$apkArch" in \
	'armv7') apk --no-cache add --virtual build-dependencies python3 build-base;; \
	esac && \
	SQLITE_VERSION=$(jq -r '.dependencies.sqlite3 // .devDependencies.sqlite3' ./cli_package.json) && \
	pnpm install -g sqlite3@$SQLITE_VERSION --prod && \
	pnpm install -g n8n@${N8N_VERSION} --prod --ignore-scripts  && \
	case "$apkArch" in \
	'armv7') apk del build-dependencies;; \
	esac && \
	rm -rf /usr/local/lib/node_modules/n8n/node_modules/@n8n/chat && \
	rm -rf /usr/local/lib/node_modules/n8n/node_modules/n8n-design-system && \
	rm -rf /usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/node_modules && \
	find /usr/local/lib/node_modules/n8n -type f -name "*.ts" -o -name "*.js.map" -o -name "*.vue" | xargs rm -f && \
	rm -rf /root/.npm

COPY docker-entrypoint.sh /

RUN \
	mkdir .n8n && \
	chown node:node .n8n
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
