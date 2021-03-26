FROM arm32v7/node:14.15

ARG N8N_VERSION

RUN if [ -z "$N8N_VERSION" ] ; then echo "The N8N_VERSION argument is missing!" ; exit 1; fi

RUN \
	apt-get update && \
	apt-get -y install graphicsmagick gosu

RUN npm_config_user=root npm install -g full-icu n8n@${N8N_VERSION}

ENV NODE_ICU_DATA /usr/local/lib/node_modules/full-icu
ENV NODE_ENV production

WORKDIR /data

CMD chown -R node:node /home/node/.n8n \
&& gosu node n8n
