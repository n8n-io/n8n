FROM n8nio/n8n:latest

USER root

# Step 1: Install system-level build and runtime dependencies
RUN apk update && apk add --no-cache \
    build-base gcc g++ gfortran musl-dev python3-dev linux-headers \
    openblas-dev lapack-dev freetype-dev libpng-dev jpeg-dev \
    libxml2-dev libxslt-dev libffi-dev openssl-dev rust cargo \
    curl-dev libpq-dev mariadb-dev gdal-dev proj-dev geos-dev \
    libx11-dev libxtst-dev xorg-server tesseract-ocr python3 py3-pip \
    git curl wget vim bash postgresql-client mysql-client

# Step 2: Copy files only (no Python package installation)
RUN mkdir -p /usr/src/app/default-workflows
COPY workflows/ /usr/src/app/default-workflows/
COPY initial-credentials/ /usr/src/app/initial-credentials/
COPY requirements.txt /tmp/requirements.txt

# Step 3: Copy and fix the setup script
COPY .devcontainer/setup-defaults.sh /tmp/setup-defaults.sh
RUN echo '#!/bin/sh' > /usr/local/bin/setup-defaults.sh && \
    tr -d '\r' < /tmp/setup-defaults.sh >> /usr/local/bin/setup-defaults.sh && \
    chmod +x /usr/local/bin/setup-defaults.sh && \
    rm /tmp/setup-defaults.sh

COPY workflows-static/ /usr/src/app/workflows-static/


# Step 4: Set correct ownership and switch back to the non-root user
RUN chown -R node:node /home/node /usr/src/app
USER node

# Step 5: Use sh explicitly to run the script
ENTRYPOINT ["/bin/sh", "/usr/local/bin/setup-defaults.sh"]