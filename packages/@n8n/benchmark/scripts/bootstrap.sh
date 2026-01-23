#!/bin/bash
#
# Script to initialize the benchmark environment on a VM
#

set -euo pipefail;

CURRENT_USER=$(whoami)

# Mount the data disk
# First wait for the disk to become available
WAIT_TIME=0
MAX_WAIT_TIME=60

while [ ! -e /dev/sdc ]; do
    if [ $WAIT_TIME -ge $MAX_WAIT_TIME ]; then
        echo "Error: /dev/sdc did not become available within $MAX_WAIT_TIME seconds."
        exit 1
    fi

    echo "Waiting for /dev/sdc to be available... ($WAIT_TIME/$MAX_WAIT_TIME)"
    sleep 1
    WAIT_TIME=$((WAIT_TIME + 1))
done

# Then mount it
if [ -d "/n8n" ]; then
	echo "Data disk already mounted. Clearing it..."
	sudo rm -rf /n8n/*
	sudo rm -rf /n8n/.[!.]*
else
	sudo mkdir -p /n8n
	sudo parted /dev/sdc --script mklabel gpt mkpart xfspart xfs 0% 100%
	sudo mkfs.xfs /dev/sdc1
	sudo partprobe /dev/sdc1
	sudo mount /dev/sdc1 /n8n
	sudo chown -R "$CURRENT_USER":"$CURRENT_USER" /n8n
fi

### Remove unneeded dependencies
# TTY
sudo systemctl disable getty@tty1.service
sudo systemctl disable serial-getty@ttyS0.service
# Snap
sudo systemctl disable snapd.service
# Unattended upgrades
sudo systemctl disable unattended-upgrades.service
# Cron
sudo systemctl disable cron.service

# Include nodejs v20 repository
curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh

# Install docker, docker compose, nodejs
sudo DEBIAN_FRONTEND=noninteractive apt-get update -yq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -yq docker.io docker-compose nodejs

# Add the current user to the docker group
sudo usermod -aG docker "$CURRENT_USER"

# Install zx
npm install zx
