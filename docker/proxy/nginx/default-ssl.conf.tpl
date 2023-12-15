server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /vol/www/;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen      443 ssl;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    include     /etc/nginx/options-ssl-nginx.conf;

    ssl_dhparam /vol/proxy/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    proxy_read_timeout 900;
    proxy_connect_timeout 900;
    proxy_send_timeout 900;

    location /static {
        alias /vol/static;
    }

    location / {
        proxy_set_header Host $host;
        proxy_pass           http://${APP_HOST}:${APP_PORT};
        proxy_set_header  X-Forwarded-Proto https;
       # include              /etc/nginx/uwsgi_params;
        client_max_body_size 10M;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}