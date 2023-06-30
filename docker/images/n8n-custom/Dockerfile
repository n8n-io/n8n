ARG NODE_VERSION=18

# 1. Create an image to build n8n
FROM n8nio/base:${NODE_VERSION} as builder

COPY --chown=node:node turbo.json package.json .npmrc pnpm-lock.yaml pnpm-workspace.yaml jest.config.js tsconfig.json ./
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node packages ./packages
COPY --chown=node:node patches ./patches

RUN apk add --update libc6-compat jq
RUN corepack enable && corepack prepare --activate
USER node

RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN rm -rf node_modules
RUN jq 'del(.pnpm.patchedDependencies)' package.json > package.json.tmp; mv package.json.tmp package.json
RUN jq '{name: .name, version: .version}' packages/editor-ui/package.json > editor-ui.tmp; mv editor-ui.tmp packages/editor-ui/package.json
RUN jq '{name: .name, version: .version}' packages/design-system/package.json > design-system.tmp; mv design-system.tmp packages/design-system/package.json
RUN NODE_ENV=production pnpm install --prod --no-optional
RUN find . -type f -name "*.ts" -o -name "*.js.map" -o -name "*.vue" -o -name "tsconfig.json" -o -name "*.tsbuildinfo" | xargs rm -rf
RUN rm -rf packages/@n8n_io/eslint-config packages/editor-ui/src packages/editor-ui/node_modules packages/design-system
RUN rm -rf patches .npmrc *.yaml node_modules/.cache packages/**/node_modules/.cache packages/**/.turbo .config .cache .local .node /tmp/*


# 2. Start with a new clean image with just the code that is needed to run n8n
FROM n8nio/base:${NODE_VERSION}
COPY --from=builder /home/node /usr/local/lib/node_modules/n8n
RUN ln -s /usr/local/lib/node_modules/n8n/packages/cli/bin/n8n /usr/local/bin/n8n
COPY docker/images/n8n-custom/docker-entrypoint.sh /

RUN \
	mkdir .n8n && \
	chown node:node .n8n
USER node
ENV NODE_ENV=production
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
