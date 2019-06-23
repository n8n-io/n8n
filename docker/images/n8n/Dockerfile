FROM mhart/alpine-node:10

# Update everything and install needed dependencies
RUN apk add --update \
	graphicsmagick

# # Set a custom user to not have n8n run as root
USER root

# Install n8n and the also temporary all the packages
# it needs to build it correctly.
RUN apk --update add --virtual build-dependencies python build-base && \
	npm_config_user=root npm install -g n8n && \
	apk del build-dependencies

WORKDIR /data

CMD "n8n"
