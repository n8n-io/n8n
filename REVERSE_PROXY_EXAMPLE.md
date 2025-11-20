# Exemples de Configuration Reverse Proxy pour n8n.making.codes

## Architecture

```
Internet (HTTPS) → Reverse Proxy (SSL terminaison) → n8n Container (HTTP port 5678)
```

Le reverse proxy gère le certificat SSL et forward les requêtes en HTTP vers le container n8n.

---

## Nginx

```nginx
server {
    listen 80;
    server_name n8n.making.codes;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name n8n.making.codes;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/n8n.making.codes/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.making.codes/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logs
    access_log /var/log/nginx/n8n.access.log;
    error_log /var/log/nginx/n8n.error.log;

    # Max upload size
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # Timeouts pour les longues requêtes
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }
}
```

---

## Traefik (v2/v3)

### docker-compose.yml avec Traefik

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=votre@email.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Traefik dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt

  n8n:
    # ... votre config n8n ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.n8n.rule=Host(`n8n.making.codes`)"
      - "traefik.http.routers.n8n.entrypoints=websecure"
      - "traefik.http.routers.n8n.tls.certresolver=letsencrypt"
      - "traefik.http.services.n8n.loadbalancer.server.port=5678"

      # Redirect HTTP to HTTPS
      - "traefik.http.routers.n8n-http.rule=Host(`n8n.making.codes`)"
      - "traefik.http.routers.n8n-http.entrypoints=web"
      - "traefik.http.routers.n8n-http.middlewares=n8n-redirect"
      - "traefik.http.middlewares.n8n-redirect.redirectscheme.scheme=https"
```

---

## Caddy

### Caddyfile

```caddy
n8n.making.codes {
    reverse_proxy localhost:5678 {
        # Headers pour WebSocket support
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}

        # Timeouts
        transport http {
            read_timeout 300s
            write_timeout 300s
        }
    }

    # Encode responses
    encode gzip

    # Logs
    log {
        output file /var/log/caddy/n8n.log
        format json
    }
}
```

Ou en one-liner :
```bash
caddy reverse-proxy --from n8n.making.codes --to localhost:5678
```

---

## Apache

```apache
<VirtualHost *:80>
    ServerName n8n.making.codes
    Redirect permanent / https://n8n.making.codes/
</VirtualHost>

<VirtualHost *:443>
    ServerName n8n.making.codes

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/n8n.making.codes/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/n8n.making.codes/privkey.pem
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/n8n_error.log
    CustomLog ${APACHE_LOG_DIR}/n8n_access.log combined

    # Proxy Configuration
    ProxyPreserveHost On
    ProxyRequests Off

    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://localhost:5678/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*)           http://localhost:5678/$1 [P,L]

    ProxyPass / http://localhost:5678/
    ProxyPassReverse / http://localhost:5678/

    # Headers
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

---

## Vérification

### Test de la configuration

```bash
# Vérifier que n8n répond en local
curl http://localhost:5678/healthz

# Vérifier que le domaine est accessible en HTTPS
curl https://n8n.making.codes/healthz

# Tester les webhooks
curl -X POST https://n8n.making.codes/webhook-test/YOUR_WEBHOOK_ID
```

### Debug

```bash
# Logs du container n8n
docker compose -f docker-compose.dev.yml logs -f n8n

# Test de résolution DNS
nslookup n8n.making.codes
dig n8n.making.codes

# Vérifier les ports ouverts
netstat -tuln | grep -E ':(80|443|5678)'
```

---

## Certificats SSL

### Avec Let's Encrypt (Certbot)

```bash
# Installation
sudo apt-get install certbot

# Nginx
sudo certbot --nginx -d n8n.making.codes

# Apache
sudo certbot --apache -d n8n.making.codes

# Standalone (si pas de serveur web)
sudo certbot certonly --standalone -d n8n.making.codes

# Renouvellement automatique
sudo certbot renew --dry-run
```

### Traefik avec Let's Encrypt

Traefik gère automatiquement les certificats SSL avec la configuration ci-dessus.

---

## Sécurité Supplémentaire

### Headers de sécurité (Nginx)

```nginx
# Ajouter dans le bloc server
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

### Limitation de débit (Nginx)

```nginx
# Dans http block
limit_req_zone $binary_remote_addr zone=n8n_limit:10m rate=10r/s;

# Dans location block
limit_req zone=n8n_limit burst=20 nodelay;
```

### IP Whitelist (si besoin)

```nginx
# Autoriser seulement certaines IPs
allow 192.168.1.0/24;
allow 10.0.0.0/8;
deny all;
```
