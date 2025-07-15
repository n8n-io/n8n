# N8N Cloud Run Deployment

このTerraformコンフィグレーションは、n8nをGoogle Cloud Runにデプロイするためのものです。

## 前提条件

1. Google Cloud SDKがインストールされていること
2. Terraformがインストールされていること
3. GCPプロジェクトが作成されていること
4. 必要なAPIが有効になっていること:
   - Cloud Run API
   - Secret Manager API
   - Container Registry API

## セットアップ手順

1. **認証設定**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud auth application-default login
   ```

2. **変数ファイルの作成**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
   
   `terraform.tfvars`を編集して、あなたの設定を入力してください。

3. **コンテナイメージの準備**
   n8nのDockerイメージをGoogle Container Registryまたは Artifact Registryにプッシュしてください。

4. **Terraformの実行**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

## 設定項目

### 必須項目
- `project_id`: GCPプロジェクトID
- `container_image`: コンテナイメージのURL
- `db_host`: データベースホスト
- `db_password`: データベースパスワード
- `n8n_encryption_key`: n8nの暗号化キー（32文字）

### オプション項目
- `region`: デプロイリージョン（デフォルト: asia-northeast1）
- `service_name`: Cloud Runサービス名（デフォルト: n8n）
- `cpu_limit`: CPUリミット（デフォルト: 2）
- `memory_limit`: メモリリミット（デフォルト: 2Gi）
- `max_instances`: 最大インスタンス数（デフォルト: 10）
- `min_instances`: 最小インスタンス数（デフォルト: 1）

## セキュリティ

- データベースパスワードとn8nの暗号化キーは、Google Secret Managerに安全に保存されます
- サービスアカウントは最小限の権限で設定されています
- デフォルトでは未認証アクセスは無効になっています

## 出力

デプロイ後、以下の情報が出力されます：
- `service_url`: デプロイされたCloud RunサービスのURL
- `service_name`: Cloud Runサービス名
- `service_location`: サービスの場所
- `service_account_email`: サービスアカウントのメールアドレス

## クリーンアップ

リソースを削除する場合：
```bash
terraform destroy
```