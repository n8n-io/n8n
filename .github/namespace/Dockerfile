# Keep versions aligned with setup-nodejs and package.json.
ARG NAMESPACE_BASE_IMAGE_REF
FROM ${NAMESPACE_BASE_IMAGE_REF}

USER root

RUN mkdir -p /opt/n8n-ci/node /opt/n8n-ci/pnpm /home/runner/.safe-chain/bin \
    && curl --fail --silent --show-error --location --retry 3 \
        https://nodejs.org/dist/v26.5.1/node-v26.5.1-linux-x64.tar.xz -o /tmp/node.tar.xz \
    && echo 'cc7b3484ade63bd203a9d304f21ec37a3b622b988d7bdecf1dc4d68fc44a91b7  /tmp/node.tar.xz' | sha256sum -c - \
    && tar -xJf /tmp/node.tar.xz -C /opt/n8n-ci/node --strip-components=1 \
    && curl --fail --silent --show-error --location --retry 3 \
        https://github.com/pnpm/pnpm/releases/download/v12.4.2/pnpm-linux-x64.tar.gz -o /tmp/pnpm.tar.gz \
    && echo 'ce1ed690fe9c2f091d7267e1afbe9380abb08bb577e95348fda194a41147d2ec  /tmp/pnpm.tar.gz' | sha256sum -c - \
    && tar -xzf /tmp/pnpm.tar.gz -C /opt/n8n-ci/pnpm \
    && curl --fail --silent --show-error --location --retry 3 \
        https://github.com/AikidoSec/safe-chain/releases/download/1.5.20/safe-chain-linuxstatic-x64 \
        -o /home/runner/.safe-chain/bin/safe-chain \
    && echo '13636819384f1e672c8c93c4ee6496113f9bde4b038ff9c59220fbb25f165199  /home/runner/.safe-chain/bin/safe-chain' | sha256sum -c - \
    && chmod +x /home/runner/.safe-chain/bin/safe-chain \
    && chown -R runner:runner /home/runner/.safe-chain \
    && rm /tmp/node.tar.xz /tmp/pnpm.tar.gz

ENV PATH="/opt/n8n-ci/node/bin:/opt/n8n-ci/pnpm:${PATH}"

USER runner
RUN test "$(node --version)" = 'v26.5.1' \
    && test "$(pnpm --version)" = '12.4.2' \
    && /home/runner/.safe-chain/bin/safe-chain -v
