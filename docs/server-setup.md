# Server Setup

!> ***Important***: Make sure that you secure your n8n instance as described under [Security](security.md).


## Example setup with docker-compose

If you have already installed docker and docker-compose, then you can directly start with step 4.


### 1. Install Docker

This can vary depending on the Linux distribution used. Example bellow is for Ubuntu:

```bash
sudo apt update
sudo apt install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu bionic stable"
sudo apt update
sudo apt install docker-ce -y
```

### 2. Optional: If it should run as not root user

Run when logged in as the user that should also be allowed to run docker:

```bash
sudo usermod -aG docker ${USER}
su - ${USER}
```

### 3. Install Docker-compose

This can vary depending on the Linux distribution used. Example bellow is for Ubuntu:

Check before what version the latestand replace "1.24.1" with that version accordingly.
https://github.com/docker/compose/releases

```bash
sudo curl -L https://github.com/docker/compose/releases/download/1.24.1/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```


### 4. Setup DNS

Add A record to route the subdomain accordingly.

```
Type: A
Name: n8n (or whatever the subdomain should be)
IP address: <IP_OF_YOUR_SERVER>
```


### 5. Create docker-compose file

Save this file as `docker-compose.yml`

Normally no changes should be needed.

```yaml
version: "3"

services:
  traefik:
    image: "traefik"
    command:
      - "--api=true"
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.mytlschallenge.acme.tlschallenge=true"
      - "--certificatesresolvers.mytlschallenge.acme.email=${SSL_EMAIL}"
      - "--certificatesresolvers.mytlschallenge.acme.storage=/letsencrypt/acme.json"
    ports:
      - "443:443"
    volumes:
      - ${DATA_FOLDER}/letsencrypt:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro

  n8n:
    image: n8nio/n8n
    ports:
      - "127.0.0.1:5678:5678"
    labels:
      - traefik.enable=true
      - traefik.http.routers.n8n.rule=Host(`${SUBDOMAIN}.${DOMAIN_NAME}`)
      - traefik.http.routers.n8n.tls=true
      - traefik.http.routers.n8n.entrypoints=websecure
      - traefik.http.routers.n8n.tls.certresolver=mytlschallenge
      - traefik.http.middlewares.n8n.headers.SSLRedirect=true
      - traefik.http.middlewares.n8n.headers.STSSeconds=315360000
      - traefik.http.middlewares.n8n.headers.browserXSSFilter=true
      - traefik.http.middlewares.n8n.headers.contentTypeNosniff=true
      - traefik.http.middlewares.n8n.headers.forceSTSHeader=true
      - traefik.http.middlewares.n8n.headers.SSLHost=${DOMAIN_NAME}
      - traefik.http.middlewares.n8n.headers.STSIncludeSubdomains=true
      - traefik.http.middlewares.n8n.headers.STSPreload=true
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER
      - N8N_BASIC_AUTH_PASSWORD
      - N8N_HOST=${SUBDOMAIN}.${DOMAIN_NAME}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_TUNNEL_URL=https://${SUBDOMAIN}.${DOMAIN_NAME}/
      - VUE_APP_URL_BASE_API=https://${SUBDOMAIN}.${DOMAIN_NAME}/
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${DATA_FOLDER}/.n8n:/root/.n8n
```


### 6. Create `.env` file

Create `.env` file and change it accordingly.

```bash
# Folder where data should be saved
DATA_FOLDER=/root/n8n/

# The top level domain to serve from
DOMAIN_NAME=example.com

# The subdomain to serve from
SUBDOMAIN=n8n

# DOMAIN_NAME and SUBDOMAIN combined decide where n8n will be reachable from
# above example would result in: https://n8n.example.com

# The user name to use for autentication - IMPORTANT ALWAYS CHANGE!
N8N_BASIC_AUTH_USER=user

# The password to use for autentication - IMPORTANT ALWAYS CHANGE!
N8N_BASIC_AUTH_PASSWORD=password

# Optional timezone to set which gets used by Cron-Node by default
# If not set New York time will be used
GENERIC_TIMEZONE=Europe/Berlin

# The email address to use for the SSL certificate creation
SSL_EMAIL=user@example.com
```


### 7. Create data folder

Create the folder which is defined as `DATA_FOLDER`. In the example
above, it is `/root/n8n/`.

In that folder, the database file from SQLite as well as the encryption key will be saved.

The folder can be created like this:
```
mkdir /root/n8n/
```


### 8. Start docker-compose setup

n8n can now be started via:

```bash
sudo docker-compose up -d
```

In case it should ever be stopped that can be done with this command:
```bash
sudo docker-compose stop
```


### 9. Done

n8n will now be reachable via the above defined subdomain + domain combination.
The above example would result in: https://n8n.example.com

n8n will only be reachable via https and not via http.
