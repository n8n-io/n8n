# N8N Cloud Run Deployment

このTerraformコンフィグレーションは、n8nをGoogle Cloud Runにデプロイするためのものです。

## 前提条件

1. Google Cloud SDKがインストールされていること
2. Terraformがインストールされていること
3. GCPプロジェクトが作成されていること
4. 必要なAPIが有効になっていること:
   - Cloud Run API
   - Secret Manager API
   - Artifact Registry API
   - Cloud SQL Admin API

## 環境別デプロイメント

このプロジェクトは、staging（stg）とproduction（prd）環境をサポートしています。

### Staging環境 (n8n-stg-466014)

```bash
# 認証設定
gcloud auth login
gcloud config set project n8n-stg-466014
gcloud auth application-default login

# Terraformの実行
terraform init
terraform plan -var-file="environments/stg/terraform.tfvars"
terraform apply -var-file="environments/stg/terraform.tfvars"
```

### Production環境 (n8n-prd-466015)

```bash
# 認証設定
gcloud auth login
gcloud config set project n8n-prd-466015
gcloud auth application-default login

# Terraformの実行
terraform init
terraform plan -var-file="environments/prd/terraform.tfvars"
terraform apply -var-file="environments/prd/terraform.tfvars"
```

## 環境別設定

### Staging環境の特徴
- プロジェクトID: `n8n-stg-466014`
- サービス名: `n8n-stg`
- リソース: 小規模（CPU: 1, Memory: 1Gi）
- インスタンス: 0-3台
- PostgreSQL: db-f1-micro, 10GB
- 削除保護: 無効

### Production環境の特徴
- プロジェクトID: `n8n-prd-466015`
- サービス名: `n8n-prd`
- リソース: 大規模（CPU: 4, Memory: 4Gi）
- インスタンス: 2-20台
- PostgreSQL: db-n1-standard-2, 100GB, Regional
- 削除保護: 有効

## 設定ファイルの更新

各環境の設定ファイルを編集してください：

- **Staging**: `environments/stg/terraform.tfvars`
- **Production**: `environments/prd/terraform.tfvars`

### 必須変更項目
```bash
# データベースパスワード（32文字以上推奨）
db_password = "your-secure-password"

# n8n暗号化キー（32文字必須）
n8n_encryption_key = "your-32-character-encryption-key"
```

## インフラストラクチャ構成

### 作成されるリソース
- **Cloud Run**: n8nアプリケーション
- **Cloud SQL**: PostgreSQLデータベース
- **Artifact Registry**: Dockerイメージリポジトリ
- **Secret Manager**: 機密情報の管理
- **IAM**: サービスアカウントと権限

### モジュール構成
```
modules/
├── cloud-run/         # Cloud Runサービス
├── postgres/          # Cloud SQL PostgreSQL
└── artifact-registry/ # Dockerリポジトリ
```

## セキュリティ

- データベースパスワードとn8nの暗号化キーは、Google Secret Managerに安全に保存
- サービスアカウントは最小限の権限で設定
- デフォルトでは未認証アクセスは無効
- Production環境では削除保護が有効

## 出力情報

デプロイ後、以下の情報が出力されます：

### Cloud Run
- `service_url`: デプロイされたCloud RunサービスのURL
- `service_name`: Cloud Runサービス名
- `service_account_email`: サービスアカウントのメールアドレス

### PostgreSQL
- `postgres_instance_name`: Cloud SQLインスタンス名
- `postgres_connection_name`: 接続名
- `postgres_host`: データベースホスト

### Artifact Registry
- `artifact_registry_repository_url`: DockerリポジトリのURL
- `container_image_url`: 完全なコンテナイメージURL

## トラブルシューティング

### よくある問題

1. **API が有効になっていない**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable sqladmin.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   ```

2. **権限が不足している**
   ```bash
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="user:YOUR_EMAIL" \
     --role="roles/editor"
   ```

3. **リソースクォータ不足**
   - GCPコンソールでクォータを確認・増加申請

## クリーンアップ

リソースを削除する場合：

```bash
# Staging環境
terraform destroy -var-file="environments/stg/terraform.tfvars"

# Production環境  
terraform destroy -var-file="environments/prd/terraform.tfvars"
```

**注意**: Production環境では削除保護が有効なため、事前に無効化が必要な場合があります。