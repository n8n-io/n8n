FROM richxsl/rhel7

ARG N8N_VERSION

RUN if [ -z "$N8N_VERSION" ] ; then echo "The N8N_VERSION argument is missing!" ; exit 1; fi

ENV N8N_VERSION=${N8N_VERSION}
RUN \
	yum install -y gcc-c++ make

RUN \
	curl -sL https://rpm.nodesource.com/setup_12.x | sudo -E bash -

RUN \
	sudo yum install nodejs

# Set a custom user to not have n8n run as root
USER root

RUN npm_config_user=root npm install -g npm@latest n8n@${N8N_VERSION}

WORKDIR /data

CMD "n8n"
