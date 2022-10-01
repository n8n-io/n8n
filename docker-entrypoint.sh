#!/bin/sh

CONFIG_PATH="/data/options.json"
N8N_PATH="/data/n8n"

mkdir -p "${N8N_PATH}/.n8n"


#####################
## USER PARAMETERS ##
#####################

# REQUIRED
    

export N8N_BASIC_AUTH_ACTIVE="$(jq --raw-output '.auth // empty' $CONFIG_PATH)"
export N8N_BASIC_AUTH_USER="$(jq --raw-output '.auth_username // empty' $CONFIG_PATH)"
export N8N_BASIC_AUTH_PASSWORD="$(jq --raw-output '.auth_password // empty' $CONFIG_PATH)"
export GENERIC_TIMEZONE="$(jq --raw-output '.timezone // empty' $CONFIG_PATH)"
export N8N_PROTOCOL="$(jq --raw-output '.protocol // empty' $CONFIG_PATH)"
export N8N_SSL_CERT="/ssl/$(jq --raw-output '.certfile // empty' $CONFIG_PATH)"
export N8N_SSL_KEY="/ssl/$(jq --raw-output '.keyfile // empty' $CONFIG_PATH)"
# export N8N_PERSONALIZATION_ENABLED="$(jq --raw-output '.personalized // empty' $CONFIG_PATH)"
export N8N_PERSONALIZATION_ENABLED=false
export N8N_USER_FOLDER="${N8N_PATH}"
export N8N_LISTEN_ADDRESS="0.0.0.0"
export N8N_DIAGNOSTICS_ENABLED=false

if [ -z "${N8N_BASIC_AUTH_USER}" ] || [ -z "${N8N_BASIC_AUTH_ACTIVE}" ]; then
    export N8N_BASIC_AUTH_ACTIVE=false
    unset N8N_BASIC_AUTH_USER
    unset N8N_BASIC_AUTH_PASSWORD
fi


###########
## MAIN  ##
###########


# if [ -d ${N8N_PATH} ] ; then
#  chmod o+rx ${N8N_PATH}
#  chown -R node ${N8N_PATH}/.n8n
#  ln -s ${N8N_PATH}/.n8n /home/node/
#fi

#chown -R node /home/node

#if [ "$#" -gt 0 ]; then
  # Got started with arguments
#  exec su-exec node "$@"
#else
  # Got started without arguments
#  exec su-exec node n8n
#fi

###########
# Updated #
###########

if [ -d ${N8N_PATH} ] ; then
  chmod o+rx ${N8N_PATH}
  chown -R node ${N8N_PATH}/.n8n
  ln -s ${N8N_PATH}/.n8n /home/node/
fi

# node user needs to be able to write in this folder to be able to customize static assets
mkdir -p /usr/local/lib/node_modules/n8n/dist/public
chown -R node /home/node /usr/local/lib/node_modules/n8n/dist/public

if [ "$#" -gt 0 ]; then
  # Got started with arguments
  COMMAND=$1;

  if [[ "$COMMAND" == "n8n" ]]; then
    shift
    exec su-exec node "$@"
  else
    exec su-exec node "$@"
  fi

else
# Got started without arguments
exec su-exec node n8n
fi
