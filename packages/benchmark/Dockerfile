# syntax=docker/dockerfile:1
FROM node:20.16.0 AS base

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
RUN corepack enable

#
# Builder
FROM base AS builder

WORKDIR /app

COPY --chown=node:node ./pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --chown=node:node ./pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --chown=node:node ./package.json /app/package.json
COPY --chown=node:node ./packages/benchmark/package.json /app/packages/benchmark/package.json
COPY --chown=node:node ./patches /app/patches
COPY --chown=node:node ./scripts /app/scripts

RUN pnpm install --frozen-lockfile

# TS config files
COPY --chown=node:node ./tsconfig.json /app/tsconfig.json
COPY --chown=node:node ./tsconfig.build.json /app/tsconfig.build.json
COPY --chown=node:node ./tsconfig.backend.json /app/tsconfig.backend.json
COPY --chown=node:node ./packages/benchmark/tsconfig.json /app/packages/benchmark/tsconfig.json
COPY --chown=node:node ./packages/benchmark/tsconfig.build.json /app/packages/benchmark/tsconfig.build.json

# Source files
COPY --chown=node:node ./packages/benchmark/src /app/packages/benchmark/src
COPY --chown=node:node ./packages/benchmark/bin /app/packages/benchmark/bin
COPY --chown=node:node ./packages/benchmark/scenarios /app/packages/benchmark/scenarios

WORKDIR /app/packages/benchmark
RUN pnpm build

#
# Runner
FROM base AS runner

COPY --from=builder /app /app

WORKDIR /app/packages/benchmark
USER node

ENTRYPOINT [ "/app/packages/benchmark/bin/n8n-benchmark" ]
