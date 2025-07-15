# Cloud SQL PostgreSQLインスタンス
# n8nのデータ永続化層として機能するマネージドPostgreSQLデータベース
resource "google_sql_database_instance" "postgres" {
  name             = var.instance_name      # インスタンス名（例: n8n-postgres-stg）
  database_version = var.database_version  # PostgreSQLバージョン（例: POSTGRES_15）
  region           = var.region            # デプロイリージョン（例: asia-northeast1）
  deletion_protection = var.deletion_protection  # 削除保護（本番環境ではtrue推奨）

  # データベースインスタンス詳細設定
  settings {
    # === インスタンス性能設定 ===
    tier              = var.tier              # マシンタイプ（例: db-f1-micro, db-n1-standard-2）
    availability_type = var.availability_type # 可用性設定（ZONAL=単一ゾーン, REGIONAL=複数ゾーン冗長）
    
    # === ストレージ設定 ===
    disk_size         = var.disk_size         # 初期ディスク容量（GB）
    disk_type         = var.disk_type         # ディスクタイプ（PD_SSD=高性能, PD_HDD=標準）
    disk_autoresize   = var.disk_autoresize   # 自動ディスク拡張（容量不足時の自動拡張）

    # === バックアップ・復旧設定 ===
    backup_configuration {
      enabled            = var.backup_enabled                    # 自動バックアップ有効化
      start_time         = var.backup_start_time                 # バックアップ開始時刻（HH:MM形式）
      point_in_time_recovery_enabled = var.point_in_time_recovery_enabled  # ポイントインタイム復旧（任意の時点への復旧）
      
      # バックアップ保持設定
      backup_retention_settings {
        retained_backups = var.backup_retention_days  # バックアップ保持日数
      }
    }

    # === ネットワーク・セキュリティ設定 ===
    ip_configuration {
      ipv4_enabled                                  = var.ipv4_enabled                                  # IPv4パブリックIP有効化
      private_network                              = var.private_network                              # プライベートネットワーク（VPC）
      enable_private_path_for_google_cloud_services = var.enable_private_path_for_google_cloud_services  # Googleサービス用プライベートパス

      # 許可ネットワーク設定（パブリックアクセス制御）
      dynamic "authorized_networks" {
        for_each = var.authorized_networks  # 許可するIPアドレス範囲のリスト
        content {
          name  = authorized_networks.value.name   # ネットワーク識別名
          value = authorized_networks.value.value  # CIDR形式のIPアドレス範囲
        }
      }
    }

    # === PostgreSQL詳細設定（database_flags） ===
    
    # チェックポイントログ有効化（データ整合性監視）
    database_flags {
      name  = "log_checkpoints"
      value = "on"  # チェックポイント処理をログに記録
    }

    # 接続ログ有効化（セキュリティ監査用）
    database_flags {
      name  = "log_connections"
      value = "on"  # データベース接続をログに記録
    }

    # 切断ログ有効化（セッション管理監視）
    database_flags {
      name  = "log_disconnections"
      value = "on"  # データベース切断をログに記録
    }

    # ロック待機ログ有効化（パフォーマンス問題検知）
    database_flags {
      name  = "log_lock_waits"
      value = "on"  # ロック待機状況をログに記録
    }

    # 長時間実行クエリログ設定（パフォーマンス監視）
    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"  # 1秒以上のクエリをログに記録（ミリ秒）
    }

    # === メンテナンスウィンドウ設定 ===
    maintenance_window {
      day          = var.maintenance_window_day          # メンテナンス曜日（1-7, 1=月曜日）
      hour         = var.maintenance_window_hour         # メンテナンス開始時刻（0-23時）
      update_track = var.maintenance_window_update_track # 更新トラック（stable=安定版優先）
    }

    # === クエリインサイト設定（パフォーマンス分析） ===
    insights_config {
      query_insights_enabled  = var.query_insights_enabled   # クエリ分析機能有効化
      query_string_length     = var.query_string_length      # 記録するクエリ文字列最大長
      record_application_tags = var.record_application_tags  # アプリケーションタグ記録
      record_client_address   = var.record_client_address    # クライアントIP記録
    }
  }
}

# n8n専用データベース作成
# PostgreSQLインスタンス内にn8nアプリケーション用のデータベースを作成
resource "google_sql_database" "database" {
  name     = var.database_name                        # データベース名（通常"n8n"）
  instance = google_sql_database_instance.postgres.name  # 上記で作成したインスタンスを指定
}

# n8nアプリケーション用データベースユーザー作成
# n8nがデータベースアクセスに使用する専用ユーザーアカウント
resource "google_sql_user" "user" {
  name     = var.database_user                         # ユーザー名（通常"n8n"）
  instance = google_sql_database_instance.postgres.name  # 対象インスタンス
  password = var.database_password                     # Secret Managerから取得したパスワード
}