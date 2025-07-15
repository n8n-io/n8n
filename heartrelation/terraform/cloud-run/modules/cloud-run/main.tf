# Cloud Run サービス定義
# n8nアプリケーションをサーバーレスコンテナとして実行するメインリソース
resource "google_cloud_run_service" "n8n" {
  name     = var.service_name  # Cloud Runサービス名（n8n-stg, n8n-prdなど）
  location = var.region        # デプロイリージョン（asia-northeast1など）

  # サービステンプレート設定 - コンテナの実行仕様を定義
  template {
    spec {
      # コンテナ設定
      containers {
        image = var.container_image  # Artifact Registryから取得するDockerイメージ

        # ポート設定 - n8nのWebUIとAPIエンドポイント用
        ports {
          container_port = 5678  # n8nのデフォルトポート
        }

        # === n8n基本設定環境変数 ===
        
        # n8nサーバー設定
        env {
          name  = "N8N_PORT"
          value = "5678"      # n8nが待ち受けるポート番号
        }

        env {
          name  = "N8N_HOST"
          value = "0.0.0.0"   # すべてのIPアドレスでリクエストを受け付け
        }

        env {
          name  = "N8N_PROTOCOL"
          value = "https"     # Cloud RunのHTTPS終端を利用
        }

        # Node.js実行環境設定
        env {
          name  = "NODE_ENV"
          value = var.node_env  # production/staging環境の識別
        }

        # === データベース接続設定 ===
        
        # データベースタイプ（postgres固定）
        env {
          name  = "DB_TYPE"
          value = var.db_type  # "postgres"
        }

        # PostgreSQL接続情報（Cloud SQLインスタンスの情報）
        env {
          name  = "DB_POSTGRESDB_HOST"
          value = var.db_host  # PostgreSQLインスタンスのプライベートIP
        }

        env {
          name  = "DB_POSTGRESDB_PORT"
          value = var.db_port  # PostgreSQLポート（通常5432）
        }

        env {
          name  = "DB_POSTGRESDB_DATABASE"
          value = var.db_name  # データベース名（n8n）
        }

        env {
          name  = "DB_POSTGRESDB_USER"
          value = var.db_user  # データベースユーザー名（n8n）
        }

        # === Secret Manager参照設定 ===
        
        # データベースパスワード（Secret Managerから動的取得）
        env {
          name = "DB_POSTGRESDB_PASSWORD"
          value_from {
            secret_key_ref {
              name = var.db_password_secret_name  # Secret Managerのシークレット名
              key  = "latest"                     # 最新バージョンを使用
            }
          }
        }

        # n8n暗号化キー（ワークフロー内の機密情報暗号化用）
        env {
          name = "N8N_ENCRYPTION_KEY"
          value_from {
            secret_key_ref {
              name = var.encryption_key_secret_name  # Secret Managerのシークレット名
              key  = "latest"                        # 最新バージョンを使用
            }
          }
        }

        # === リソース制限設定 ===
        resources {
          limits = {
            cpu    = var.cpu_limit     # CPU制限（例: "1", "2", "4"）
            memory = var.memory_limit  # メモリ制限（例: "1Gi", "2Gi", "4Gi"）
          }
        }
      }

      # セキュリティ設定
      service_account_name = google_service_account.n8n.email  # 専用サービスアカウントを使用
      timeout_seconds      = var.timeout_seconds              # リクエストタイムアウト（秒）
    }

    # サービスメタデータとオートスケーリング設定
    metadata {
      annotations = {
        # Knative（Cloud Runの基盤）オートスケーリング設定
        "autoscaling.knative.dev/maxScale"     = var.max_instances  # 最大インスタンス数
        "autoscaling.knative.dev/minScale"     = var.min_instances  # 最小インスタンス数（0=完全スケールダウン可能）
        
        # Cloud Run固有設定
        "run.googleapis.com/cpu-throttling"     = "false"  # CPUスロットリング無効（常時CPU利用可能）
        "run.googleapis.com/execution-environment" = "gen2"   # 第2世代実行環境（高性能）
      }
    }
  }

  # トラフィック分散設定
  traffic {
    percent         = 100   # 100%のトラフィックを最新リビジョンに送信
    latest_revision = true  # 常に最新のリビジョンを使用
  }

  # リビジョン名の自動生成（デプロイ時にユニークな名前を付与）
  autogenerate_revision_name = true
}

# パブリックアクセス制御（IAMポリシー）
# allow_unauthenticated=trueの場合のみ、インターネットからの未認証アクセスを許可
resource "google_cloud_run_service_iam_member" "public_access" {
  count    = var.allow_unauthenticated ? 1 : 0  # 条件付き作成
  service  = google_cloud_run_service.n8n.name
  location = google_cloud_run_service.n8n.location
  role     = "roles/run.invoker"  # Cloud Runサービス実行権限
  member   = "allUsers"           # すべてのユーザー（パブリックアクセス）
}

# Cloud Run専用サービスアカウント
# 最小権限の原則に従い、必要な権限のみを付与
resource "google_service_account" "n8n" {
  account_id   = "${var.service_name}-sa"                    # サービスアカウントID
  display_name = "Service Account for ${var.service_name}"   # 表示名
  description  = "Service account for n8n Cloud Run service"  # 説明
}

# Secret Manager アクセス権限
# n8nコンテナがSecret Managerからパスワードと暗号化キーを取得するために必要
resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"  # Secret読み取り専用権限
  member  = "serviceAccount:${google_service_account.n8n.email}"
}