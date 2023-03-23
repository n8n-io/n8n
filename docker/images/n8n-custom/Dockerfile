ARG NODE_VERSION=16

# 1. Create an image to build n8n
FROM n8nio/base:${NODE_VERSION} as builder

COPY turbo.json package.json .npmrc pnpm-lock.yaml pnpm-workspace.yaml jest.config.js tsconfig.json ./
COPY scripts ./scripts
COPY packages ./packages
COPY patches ./patches

RUN apk add --update libc6-compat jq
RUN corepack enable && corepack prepare --activate
RUN chown -R node:node .
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

# Puppeteer dependencies

RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  yarn
RUN npm install -g image-size pdfkit puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
RUN yarn add puppeteer@13.5.0
RUN addgroup -S pptruser && adduser -S -G node pptruser
RUN mkdir -p /home/node/Downloads /app
RUN chown -R node:node /app
RUN find . -type f -name "*.ts" -o -name "*.js.map" -o -name "*.vue" -o -name "tsconfig.json" -o -name "*.tsbuildinfo" | xargs rm -rf
RUN rm -rf packages/@n8n_io/eslint-config packages/editor-ui/src packages/editor-ui/node_modules packages/design-system
RUN rm -rf patches .npmrc *.yaml node_modules/.cache packages/**/node_modules/.cache packages/**/.turbo .config .cache .local .node /tmp/*

RUN \
	mkdir .n8n && \
	chown node:node .n8n
USER node
ENV NODE_ENV=production
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
