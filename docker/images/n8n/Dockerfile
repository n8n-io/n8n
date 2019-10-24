FROM node:12.9.1-alpine

ARG N8N_VERSION

RUN if [ -z "$N8N_VERSION" ] ; then echo "The N8N_VERSION argument is missing!" ; exit 1; fi

# Update everything, install needed dependencies and create n8n user
RUN apk add --update \
	graphicsmagick; \
	adduser -S -h /home/n8n -u 1001 n8n

# Install n8n and the also temporary all the packages
# it needs to build it correctly.

RUN apk --update add --virtual build-dependencies python build-base && \
	npm_config_user=root npm install -g n8n@${N8N_VERSION} && \
	 apk del build-dependencies

USER n8n

WORKDIR /data

CMD "n8n"
