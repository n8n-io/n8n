# Keep these pins in sync with setup-nodejs, package.json and pnpm-workspace.yaml.
FROM docker:29-cli@sha256:018edbc908e08fcc9dbf029c812c34251e9b4719e6f71ca0e5eae2a987d014ca AS docker-cli

FROM node:26.5.1-bookworm@sha256:057896e7e3f542ff82f7e65f106ac04e646775316449e676dfe8fb053d3b43ef

ARG TARGETARCH
ARG PNPM_VERSION=12.4.2
ARG PLAYWRIGHT_VERSION=1.62.1
ARG SAFE_CHAIN_VERSION=1.5.20

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins /usr/local/libexec/docker/cli-plugins

RUN npm install --global "pnpm@${PNPM_VERSION}" \
    && npm install --prefix /opt/ci-playwright --ignore-scripts --no-save "playwright@${PLAYWRIGHT_VERSION}" \
    && apt-get update \
    && apt-get install -y --no-install-recommends git jq rsync sudo \
    && node /opt/ci-playwright/node_modules/playwright/cli.js install chromium --with-deps \
    && rm -rf /var/lib/apt/lists/* /root/.npm

# Use the release binary, not the installer's mutable "latest" endpoint.
RUN case "$TARGETARCH" in \
      amd64) arch=x64; checksum=13636819384f1e672c8c93c4ee6496113f9bde4b038ff9c59220fbb25f165199 ;; \
      arm64) arch=arm64; checksum=4b28beef1eafc0382da969a42bd4ea85bb889dd2b0fa479e1083729e07aef9ab ;; \
      *) exit 1 ;; \
    esac \
    && mkdir -p /opt/ci-toolchain \
    && curl -fsSL "https://github.com/AikidoSec/safe-chain/releases/download/${SAFE_CHAIN_VERSION}/safe-chain-linuxstatic-${arch}" -o /opt/ci-toolchain/safe-chain \
    && printf '%s  %s\n' "$checksum" /opt/ci-toolchain/safe-chain | sha256sum -c - \
    && chmod +x /opt/ci-toolchain/safe-chain
