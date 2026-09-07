ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine

ARG NODE_VERSION

RUN apk add --no-cache \
    openssh sudo shadow bash libc-utils \
    git openssl graphicsmagick tini tzdata ca-certificates libc6-compat
RUN echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/node && chmod 0440 /etc/sudoers.d/node
RUN mkdir /workspaces && chown node:node /workspaces
RUN corepack enable

ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH

USER node
RUN mkdir -p $PNPM_HOME ~/.pnpm-store && pnpm config set store-dir ~/.pnpm-store --global
