"""Tests for the configuration module."""

import os
from unittest import mock

from app.config import Settings


class TestSettings:
    """Tests for the Settings class."""

    def test_default_values(self):
        """Test that default values are set correctly."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings()
            assert settings.token_ttl == 3600
            assert settings.max_upload_size == 100 * 1024 * 1024
            assert settings.file_expiration == 24 * 3600
            assert settings.cleanup_interval == 3600
            assert settings.n8n_webhook_url is None

    def test_custom_values_from_env(self):
        """Test that values can be customized via environment variables."""
        env_vars = {
            "ANONIMIZADOR_TOKEN_TTL": "7200",
            "ANONIMIZADOR_MAX_UPLOAD_SIZE": "52428800",
            "ANONIMIZADOR_FILE_EXPIRATION": "43200",
            "ANONIMIZADOR_CLEANUP_INTERVAL": "1800",
            "ANONIMIZADOR_N8N_WEBHOOK_URL": "https://example.com/webhook",
            "ANONIMIZADOR_MASTER_KEY": "0" * 64,
            "ANONIMIZADOR_JWT_SECRET": "test-secret",
        }
        with mock.patch.dict(os.environ, env_vars, clear=True):
            settings = Settings()
            assert settings.token_ttl == 7200
            assert settings.max_upload_size == 50 * 1024 * 1024
            assert settings.file_expiration == 43200
            assert settings.cleanup_interval == 1800
            assert settings.n8n_webhook_url == "https://example.com/webhook"
            assert settings.jwt_secret == "test-secret"

    def test_allowed_extensions_default(self):
        """Test default allowed extensions."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings()
            assert ".jpg" in settings.allowed_extensions
            assert ".pdf" in settings.allowed_extensions
            assert ".docx" in settings.allowed_extensions
            assert ".xlsx" in settings.allowed_extensions

    def test_allowed_extensions_custom(self):
        """Test custom allowed extensions."""
        env_vars = {
            "ANONIMIZADOR_ALLOWED_EXTENSIONS": ".jpg,.png,.pdf",
        }
        with mock.patch.dict(os.environ, env_vars, clear=True):
            settings = Settings()
            assert settings.allowed_extensions == {".jpg", ".png", ".pdf"}
            assert ".docx" not in settings.allowed_extensions
