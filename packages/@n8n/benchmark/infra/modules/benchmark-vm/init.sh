#!/bin/bash

# Mount the data disk
sudo mkdir /n8n
sudo parted /dev/sdc --script mklabel gpt mkpart xfspart xfs 0% 100%
sudo mkfs.xfs /dev/sdc1
sudo partprobe /dev/sdc1
sudo mount /dev/sdc1 /n8n
# Allow the benchmark user to write to the data disk
sudo chown -R benchmark:benchmark /n8n

# Include nodejs v20 repository
curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh

# Install docker, docker compose and nodejs
apt-get update
apt-get install -y docker.io docker-compose nodejs

# Add the benchmark user to the docker group
usermod -aG docker benchmark
