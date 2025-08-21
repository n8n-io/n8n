# syntax=docker/dockerfile:1
FROM node:22.16.0 AS base

# Install required dependencies
RUN apt-get update && apt-get install -y gnupg2 curl

# Add k6 GPG key and repository
RUN mkdir -p /etc/apt/keyrings && \
	curl -sS https://dl.k6.io/key.gpg | gpg --dearmor --yes -o /etc/apt/keyrings/k6.gpg && \
	chmod a+x /etc/apt/keyrings/k6.gpg && \
	echo "deb [signed-by=/etc/apt/keyrings/k6.gpg] https://dl.k6.io/deb stable main" | tee /etc/apt/sources.list.d/k6.list

# Update and install k6
RUN apt-get update && \
	apt-get install -y k6 tini && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@0.33 && corepack enable

#
# Builder
FROM base AS builder

WORKDIR /app

COPY --chown=node:node ./pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --chown=node:node ./pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --chown=node:node ./package.json /app/package.json
COPY --chown=node:node ./packages/@n8n/benchmark/package.json /app/packages/@n8n/benchmark/package.json
COPY --chown=node:node ./patches /app/patches
COPY --chown=node:node ./scripts /app/scripts

ENV DOCKER_BUILD=true
RUN pnpm install --frozen-lockfile

# TS config files
COPY --chown=node:node ./packages/@n8n/typescript-config/tsconfig.common.json /app/packages/@n8n/typescript-config/tsconfig.common.json
COPY --chown=node:node ./packages/@n8n/typescript-config/tsconfig.build.json /app/packages/@n8n/typescript-config/tsconfig.build.json
COPY --chown=node:node ./packages/@n8n/typescript-config/tsconfig.backend.json /app/packages/@n8n/typescript-config/tsconfig.backend.json
COPY --chown=node:node ./packages/@n8n/benchmark/tsconfig.json /app/packages/@n8n/benchmark/tsconfig.json
COPY --chown=node:node ./packages/@n8n/benchmark/tsconfig.build.json /app/packages/@n8n/benchmark/tsconfig.build.json

# Source files
COPY --chown=node:node ./packages/@n8n/benchmark/src /app/packages/@n8n/benchmark/src
COPY --chown=node:node ./packages/@n8n/benchmark/bin /app/packages/@n8n/benchmark/bin
COPY --chown=node:node ./packages/@n8n/benchmark/scenarios /app/packages/@n8n/benchmark/scenarios

WORKDIR /app/packages/@n8n/benchmark
RUN pnpm build

#
# Runner
FROM base AS runner

COPY --from=builder /app /app

WORKDIR /app/packages/@n8n/benchmark
USER node

ENTRYPOINT [ "/app/packages/@n8n/benchmark/bin/n8n-benchmark" ]
