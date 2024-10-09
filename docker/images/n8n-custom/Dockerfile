ARG NODE_VERSION=20

# 1. Create an image to build n8n
FROM --platform=linux/amd64 n8nio/base:${NODE_VERSION} AS builder

# Build the application from source
WORKDIR /src
COPY . /src
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm/metadata DOCKER_BUILD=true pnpm install --frozen-lockfile
RUN pnpm build

# Delete all dev dependencies
RUN jq 'del(.pnpm.patchedDependencies)' package.json > package.json.tmp; mv package.json.tmp package.json
RUN node .github/scripts/trim-fe-packageJson.js

# Delete any source code, source-mapping, or typings
RUN find . -type f -name "*.ts" -o -name "*.js.map" -o -name "*.vue" -o -name "tsconfig.json" -o -name "*.tsbuildinfo" | xargs rm -rf

# Deploy the `n8n` package into /compiled
RUN mkdir /compiled
RUN NODE_ENV=production DOCKER_BUILD=true pnpm --filter=n8n --prod --no-optional deploy /compiled

# 2. Start with a new clean image with just the code that is needed to run n8n
FROM n8nio/base:${NODE_VERSION}
ENV NODE_ENV=production

ARG N8N_RELEASE_TYPE=dev
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}

WORKDIR /home/node
COPY --from=builder /compiled /usr/local/lib/node_modules/n8n
COPY docker/images/n8n/docker-entrypoint.sh /

# Setup the Task Runner Launcher
ARG LAUNCHER_VERSION=0.1.0
ENV N8N_RUNNERS_USE_LAUNCHER=true \
    N8N_RUNNERS_LAUNCHER_PATH=/usr/local/bin/task-runner-launcher
COPY docker/images/n8n/n8n-task-runners.json /etc/n8n-task-runners.json
# First, download, verify, then extract the launcher binary
# Second, chmod with 4555 to allow the use of setuid
# Third, create a new user and group to execute the Task Runners under
RUN \
	mkdir /launcher-temp && \
	cd /launcher-temp && \
	wget https://github.com/n8n-io/task-runner-launcher/releases/download/${LAUNCHER_VERSION}/task-runner-launcher_${LAUNCHER_VERSION}_x86_64-unknown-linux-musl.zip && \
	wget https://github.com/n8n-io/task-runner-launcher/releases/download/${LAUNCHER_VERSION}/task-runner-launcher_${LAUNCHER_VERSION}_x86_64-unknown-linux-musl.zip.sha256sum && \
	sha256sum -c task-runner-launcher_${LAUNCHER_VERSION}_x86_64-unknown-linux-musl.zip.sha256sum && \
	unzip -d $(dirname ${N8N_RUNNERS_LAUNCHER_PATH}) task-runner-launcher_${LAUNCHER_VERSION}_x86_64-unknown-linux-musl.zip task-runner-launcher && \
	cd - && \
  rm -r /launcher-temp && \
	chmod 4555 ${N8N_RUNNERS_LAUNCHER_PATH} && \
	addgroup -g 2000 task-runner && \
	adduser -D -u 2000 -g "Task Runner User" -G task-runner task-runner

RUN \
	cd /usr/local/lib/node_modules/n8n && \
	npm rebuild sqlite3 && \
	cd - && \
	ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n && \
	mkdir .n8n && \
	chown node:node .n8n

ENV SHELL /bin/sh
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
