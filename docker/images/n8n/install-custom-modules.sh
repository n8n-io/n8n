#!/bin/bash

# run only on first creation of container
CONTAINER_FIRST_STARTUP="CONTAINER_FIRST_STARTUP"
if [ ! -e /$CONTAINER_FIRST_STARTUP ]; then
    touch /$CONTAINER_FIRST_STARTUP
else
    	echo "Recreate container to (re-)install modules or execute this script manually. Exiting."
	exit 0
fi

# create folder to install modules in
n8ndir="/home/node/.n8n"
if [ ! -d $n8ndir ] ; then
	mkdir $n8ndir
  chmod o+rx $n8ndir
  chown -R node $n8ndir
fi

# install dependencies for OPENSSH + expect
if [ "$OPENSSH" = true ] ; then
  apk update && apk add openssh openssh-keygen expect
	mkdir /home/node/.ssh && chown node:node /home/node/.ssh && chmod 2700 /home/node/.ssh
fi

# Directories
CUSTOM_MODULE_DIR="/home/node/.n8n/custom"

# Install custom apk
if [ ! -z "$CUSTOM_APK" ]
then
    LIST=(${CUSTOM_APK//;/ })
		apk update
    for module in "${LIST[@]}"; do
        echo "custom apk: ${module}"
        apk add ${module}
    done
		rm -rf /var/cache/apk/*
fi

# Create custom extension folder if it is not present
if [ ! -z "$N8N_CUSTOM_EXTENSIONS" ]
then
    LIST=(${N8N_CUSTOM_EXTENSIONS//;/ })
    if [[ ! -d "${LIST[0]}" ]]
    then
        echo "custom extension: ${LIST[0]}"
        mkdir "${LIST[0]}"
    fi
    CUSTOM_MODULE_DIR="${LIST[0]}"
else
    if [[ ! -d "$CUSTOM_MODULE_DIR" ]]
    then
        mkdir "$CUSTOM_MODULE_DIR"
    fi
fi

# Inspect Custom Module Dir
cd $CUSTOM_MODULE_DIR
# init npm project if no package.json present
if [ ! -e package.json ]; then
    npm init --y
fi
echo "Initializing installation. The following modules are installed:"
npm list --depth:0
echo "The following modules are outdated:"
npm outdated

#function to install npm packages (+ with flags)
function npm_install () {
LIST=$1
FLAGS=$2
cd $CUSTOM_MODULE_DIR
echo "Starting installation..."
for module in "${LIST[@]}"; do
    PACKAGEVERSION=$(grep -Eo "@([0-9]{1,}\.)*[0-9]{1,}|^github:.+#.+" <<< $module)
    if [[ ! $PACKAGEVERSION ]]; then 
        echo "installing ${module}@latest"
        npm i "${module}@latest" $FLAGS
        npm list ${module} --depth=0
    else 
        echo "Installing ${module}" 
        npm i "${module}" $FLAGS
    fi
done
return 0
}

# Install custom modules; --prefix does not work
if [ ! -z "$CUSTOM_MODULES" ]
then
    LIST=(${CUSTOM_MODULES//;/ })
    npm_install $LIST ""
fi

# Install custom modules using --unsafe-perm flag; --prefix does not work
if [ ! -z "$CUSTOM_MODULES_UNSAFEPERM" ]
then
    LIST=(${CUSTOM_MODULES_UNSAFEPERM//;/ })
    npm_install $LIST "--unsafe-perm"
fi

# Install allowed external functions; --prefix does not work
if [ ! -z "$NODE_FUNCTION_ALLOW_EXTERNAL" ]
then
    LIST=(${NODE_FUNCTION_ALLOW_EXTERNAL//,/ })
    npm_install $LIST "-g"
fi

# Check for outdated Versions in Custom Module Dir
if [[ -d "$CUSTOM_MODULE_DIR" ]]
then
  echo "Installation/update complete. The following modules are outdated:"
  npm outdated
fi
