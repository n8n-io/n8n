FROM node:10.16

ARG N8N_VERSION

RUN if [ -z "$N8N_VERSION" ] ; then echo "The N8N_VERSION argument is missing!" ; exit 1; fi

RUN \
	apt-get update && \
	apt-get -y install graphicsmagick

# Set a custom user to not have n8n run as root
USER root

RUN npm_config_user=root npm install -g n8n@${N8N_VERSION}

WORKDIR /data

CMD "n8n"
