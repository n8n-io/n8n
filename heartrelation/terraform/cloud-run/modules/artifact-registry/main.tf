# Google Artifact Registry リポジトリ
# n8nアプリケーションのDockerイメージを保存・管理するためのコンテナレジストリ
# GitHub ActionsのCIパイプラインからプッシュされたイメージをここに格納し、
# Cloud Runデプロイ時にこのリポジトリからイメージを取得する
resource "google_artifact_registry_repository" "n8n_images" {
  location      = var.location      # リポジトリの地理的配置（例: asia-northeast1）
  repository_id = var.repository_id # リポジトリ識別子（例: n8n-images）
  description   = var.description   # リポジトリの説明（例: "Docker repository for n8n images"）
  format        = "DOCKER"          # リポジトリ形式（DOCKER=Dockerイメージ専用）
  
  # このリポジトリには以下の形式でイメージが保存される:
  # {location}-docker.pkg.dev/{project_id}/{repository_id}/{image_name}:{tag}
  # 例: asia-northeast1-docker.pkg.dev/n8n-stg-466014/n8n-images/n8n:latest
}