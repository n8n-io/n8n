#!/bin/bash

# Install fio
DEBIAN_FRONTEND=noninteractive sudo apt-get -y install fio > /dev/null

# Run the disk benchmark
fio --name=rand_rw --ioengine=libaio --rw=randrw --rwmixread=70 --bs=4k --numjobs=4 --size=1G --runtime=30 --directory=/n8n --group_reporting

# Remove files
sudo rm /n8n/rand_rw.*

# Uninstall fio
DEBIAN_FRONTEND=noninteractive sudo apt-get -y remove fio > /dev/null
