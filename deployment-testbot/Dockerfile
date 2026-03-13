FROM node:24-alpine

RUN apk add --no-cache tini wget

WORKDIR /home/node

COPY compiled /usr/local/lib/node_modules/n8n

RUN cd /usr/local/lib/node_modules/n8n && \
    npm rebuild sqlite3 isolated-vm && \
    ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n && \
    mkdir -p /home/node/.n8n && \
    chown -R node:node /home/node && \
    rm -rf /root/.npm /tmp/*

EXPOSE 5678/tcp
USER node
ENTRYPOINT ["tini", "--"]
CMD ["n8n"]
