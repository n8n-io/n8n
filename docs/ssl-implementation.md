# n8n SSL実装ガイド

## 実装ファイル

### 1. docker-compose.ssl.yml

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n
    container_name: n8n
    restart: unless-stopped
    environment:
      - N8N_HOST=your-domain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://your-domain.com
      - N8N_EDITOR_BASE_URL=https://your-domain.com
    volumes:
      - ./n8n_data:/home/node/.n8n
      - ./local_files:/files
    networks:
      - n8n-network
    expose:
      - 5678

  nginx:
    image: nginx:alpine
    container_name: n8n-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - n8n
    networks:
      - n8n-network

networks:
  n8n-network:
    driver: bridge
```

### 2. nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    # アップストリームの定義
    upstream n8n {
        server n8n:5678;
    }

    # HTTPをHTTPSにリダイレクト
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS設定
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL証明書の設定
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # SSL設定
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # セキュリティヘッダー
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # プロキシ設定
        location / {
            proxy_pass http://n8n;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_buffering off;
            proxy_request_buffering off;
        }

        # Webhook用の設定
        location /webhook {
            proxy_pass http://n8n;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_buffering off;
            proxy_request_buffering off;
        }
    }
}
```

### 3. setup-ssl.sh

```bash
#!/bin/bash

# 設定
DOMAIN="your-domain.com"
EMAIL="your-email@example.com"

echo "n8n SSL Setup Script"
echo "===================="

# SSL証明書ディレクトリの作成
mkdir -p ssl

# Let's Encryptを使用する場合
if [ "$1" == "letsencrypt" ]; then
    echo "Let's Encryptを使用してSSL証明書を取得します..."
    
    # Certbotを使用した証明書の取得
    docker run --rm \
        -v $(pwd)/ssl:/etc/letsencrypt \
        -v $(pwd)/ssl-data:/data/letsencrypt \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN
    
    # 証明書のシンボリックリンク作成
    ln -sf /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/fullchain.pem
    ln -sf /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/privkey.pem
    
# 自己署名証明書を使用する場合（開発環境）
else
    echo "自己署名証明書を作成します（開発環境用）..."
    
    # 自己署名証明書の作成
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/privkey.pem \
        -out ssl/fullchain.pem \
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Development/CN=$DOMAIN"
fi

echo "SSL証明書の準備が完了しました。"

# 権限の設定
chmod 600 ssl/privkey.pem
chmod 644 ssl/fullchain.pem

echo ""
echo "次のステップ:"
echo "1. nginx.confとdocker-compose.ssl.ymlのyour-domain.comを実際のドメインに置き換えてください"
echo "2. docker-compose -f docker-compose.ssl.yml up -d でサービスを起動してください"
echo "3. https://$DOMAIN でn8nにアクセスできます"
```

## 使用方法

### 1. Let's Encryptを使用する場合（本番環境推奨）

```bash
# 実行権限を付与
chmod +x setup-ssl.sh

# Let's Encrypt証明書を取得
./setup-ssl.sh letsencrypt

# 設定ファイルのドメインを編集
sed -i 's/your-domain.com/実際のドメイン/g' nginx.conf
sed -i 's/your-domain.com/実際のドメイン/g' docker-compose.ssl.yml

# サービスを起動
docker-compose -f docker-compose.ssl.yml up -d
```

### 2. 自己署名証明書を使用する場合（開発環境）

```bash
# 実行権限を付与
chmod +x setup-ssl.sh

# 自己署名証明書を作成
./setup-ssl.sh

# サービスを起動
docker-compose -f docker-compose.ssl.yml up -d
```

## 証明書の自動更新（Let's Encrypt）

Cronジョブで自動更新を設定：

```bash
# crontabに追加
0 0 * * 0 docker run --rm -v $(pwd)/ssl:/etc/letsencrypt certbot/certbot renew && docker-compose -f docker-compose.ssl.yml restart nginx
```

## 確認方法

1. **サービスの状態確認**
   ```bash
   docker-compose -f docker-compose.ssl.yml ps
   ```

2. **ログの確認**
   ```bash
   docker-compose -f docker-compose.ssl.yml logs -f
   ```

3. **SSL証明書の確認**
   ```bash
   openssl s_client -connect your-domain.com:443 -servername your-domain.com
   ```

## 注意事項

- ファイアウォールでポート80と443を開放する必要があります
- Let's Encryptを使用する場合、ドメインがサーバーに向いている必要があります
- 本番環境では必ず有効なSSL証明書を使用してください