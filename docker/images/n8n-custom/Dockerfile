ARG NODE_VERSION=16

# 1. Create an image to build n8n
FROM n8nio/base:${NODE_VERSION} as builder

RUN \
	apk --no-cache add git && \
	npm install -g run-script-os turbo

COPY turbo.json package.json package-lock.json ./
COPY packages ./packages

RUN chown -R node:node .
RUN npm config set legacy-peer-deps true

USER node

RUN \
	npm ci && \
	npm run build && \
	# TODO: removing dev dependecies is deleting `bn.js`, which breaks the Snowflake node
	npm prune --omit=dev && \
	npm i --omit=dev bn.js && \
	find . -type f -name "*.ts" -o -name "*.js.map" -o -name "*.vue" | xargs rm &&\
	rm -rf node_modules/.cache packages/*/node_modules/.cache packages/*/.turbo .config .npm /tmp/*


# 2. Start with a new clean image with just the code that is needed to run n8n
FROM n8nio/node:${NODE_VERSION}
COPY --from=builder /home/node ./
COPY docker/images/n8n-custom/docker-entrypoint.sh ./
USER node
ENV NODE_ENV=production
ENTRYPOINT ["tini", "--", "./docker-entrypoint.sh"]
