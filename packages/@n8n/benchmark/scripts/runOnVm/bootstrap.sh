#!/bin/bash
#
# Script to initialize the benchmark environment on a VM
#

set -euo pipefail;

CURRENT_USER=$(whoami)

# Mount the data disk
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
fi

# Allow the current user to write to the data disk
sudo chmod a+rw /n8n

# Include nodejs v20 repository
curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh

# Install docker, docker compose and nodejs
sudo DEBIAN_FRONTEND=noninteractive apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose nodejs

# Add the current user to the docker group
sudo usermod -aG docker "$CURRENT_USER"

# Install zx
npm install zx
