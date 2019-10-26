#!/bin/sh

ln -s /usr/share/zoneinfo/${GENERIC_TIMEZONE:-America/New_York} /etc/localtime

exec "$@"
