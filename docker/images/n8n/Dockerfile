FROM node:12.13.0-alpine

ARG N8N_VERSION

RUN if [ -z "$N8N_VERSION" ] ; then echo "The N8N_VERSION argument is missing!" ; exit 1; fi

# Update everything and install needed dependencies
RUN apk add --update graphicsmagick tzdata

# # Set a custom user to not have n8n run as root
USER root

# Install n8n and the also temporary all the packages
# it needs to build it correctly.
RUN apk --update add --virtual build-dependencies python build-base ca-certificates && \
	npm_config_user=root npm install -g n8n@${N8N_VERSION} && \
	apk del build-dependencies

WORKDIR /data

CMD ["n8n"]
