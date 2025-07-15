# N8N Cloud Run Deployment
# Google Cloud Run上にn8nワークフロー自動化ツールをデプロイするためのメイン設定ファイル
# このファイルでは3つのモジュール（Artifact Registry、PostgreSQL、Cloud Run）を統合管理

# ローカル変数の定義 - 全リソースで共通利用するラベル設定
locals {
  common_labels = {
    application = "n8n"                # アプリケーション名の識別子
    environment = var.node_env         # 環境識別（staging/production）
    managed_by  = "terraform"          # リソース管理ツールの明示
  }
}

# Artifact Registry モジュール
# n8nのDockerイメージを保存するためのコンテナレジストリを作成
# GitHub ActionsからpushされたDockerイメージをここに格納し、Cloud Runで利用
module "artifact_registry" {
  source = "./modules/artifact-registry"

  project_id    = var.project_id                    # GCPプロジェクトID
  location      = var.artifact_registry_location    # レジストリの地理的配置（asia-northeast1など）
  repository_id = var.artifact_registry_repository  # リポジトリ名（n8n-imagesなど）
  description   = "Docker repository for n8n images"  # リポジトリの説明

  # 依存関係: Artifact Registry APIが有効化された後に作成される
  depends_on = [google_project_service.artifact_registry_api]
}

# PostgreSQL モジュール
# n8nのデータ永続化用のCloud SQL PostgreSQLインスタンスを作成
# ワークフロー、認証情報、実行履歴などを保存
module "postgres" {
  source = "./modules/postgres"

  # インスタンス基本設定
  instance_name       = var.postgres_instance_name     # Cloud SQLインスタンス名
  database_version    = var.postgres_database_version  # PostgreSQLバージョン（POSTGRES_15など）
  region              = var.region                     # デプロイリージョン
  
  # パフォーマンス・容量設定
  tier                = var.postgres_tier              # マシンタイプ（db-f1-micro, db-n1-standard-2など）
  availability_type   = var.postgres_availability_type # 可用性タイプ（ZONAL/REGIONAL）
  disk_size           = var.postgres_disk_size         # ディスク容量（GB）
  disk_type           = var.postgres_disk_type         # ディスクタイプ（PD_SSD/PD_HDD）
  
  # セキュリティ・バックアップ設定
  deletion_protection = var.postgres_deletion_protection # 削除保護（本番環境ではtrue推奨）
  backup_enabled      = var.postgres_backup_enabled      # 自動バックアップ有効化
  authorized_networks = var.postgres_authorized_networks # アクセス許可ネットワーク
  
  # データベース・ユーザー設定
  database_name       = var.db_name                       # 作成するデータベース名
  database_user       = var.db_user                       # データベースユーザー名
  database_password   = data.google_secret_manager_secret_version.db_password.secret_data  # Secret Managerから取得したパスワード

  # 依存関係: Cloud SQL Admin APIが有効化された後に作成される
  depends_on = [google_project_service.sql_admin_api]
}

# Cloud Run モジュール
# n8nアプリケーション本体をCloud Runサービスとしてデプロイ
# コンテナ化されたn8nがここで動作し、ユーザーからのHTTPリクエストを処理
module "cloud_run" {
  source = "./modules/cloud-run"

  # 基本設定
  project_id                 = var.project_id          # GCPプロジェクトID
  region                     = var.region              # デプロイリージョン
  service_name               = var.service_name        # Cloud Runサービス名
  container_image            = var.container_image     # デプロイするDockerイメージURL
  node_env                   = var.node_env            # Node.js環境設定（production/staging）
  
  # データベース接続設定（PostgreSQLモジュールの出力を利用）
  db_type                    = var.db_type                        # データベースタイプ（postgres）
  db_host                    = module.postgres.database_host      # PostgreSQLインスタンスのIPアドレス
  db_port                    = module.postgres.database_port      # PostgreSQLポート（通常5432）
  db_name                    = module.postgres.database_name      # データベース名
  db_user                    = module.postgres.database_user      # データベースユーザー名
  
  # Secret Manager参照設定（機密情報は直接渡さず、Secret名を渡す）
  db_password_secret_name    = google_secret_manager_secret.db_password.secret_id      # DBパスワードシークレット名
  encryption_key_secret_name = google_secret_manager_secret.encryption_key.secret_id   # n8n暗号化キーシークレット名
  
  # リソース制限設定
  cpu_limit                  = var.cpu_limit           # CPUリミット（1, 2, 4など）
  memory_limit               = var.memory_limit        # メモリリミット（1Gi, 2Gi, 4Giなど）
  timeout_seconds            = var.timeout_seconds     # リクエストタイムアウト（秒）
  
  # オートスケーリング設定
  max_instances              = var.max_instances       # 最大インスタンス数
  min_instances              = var.min_instances       # 最小インスタンス数（0=完全スケールダウン可能）
  
  # アクセス制御
  allow_unauthenticated      = var.allow_unauthenticated  # 未認証アクセス許可（通常はfalse）

  # 依存関係: 必要なAPIとシークレットが準備された後に作成される
  depends_on = [
    google_project_service.cloud_run_api,                    # Cloud Run API有効化
    google_secret_manager_secret_version.db_password,        # DBパスワードシークレット作成
    google_secret_manager_secret_version.encryption_key      # 暗号化キーシークレット作成
  ]
}