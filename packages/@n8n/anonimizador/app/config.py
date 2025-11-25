"""Configuration management via environment variables."""

import os
import secrets
from pathlib import Path


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self) -> None:
        # Token TTL in seconds (default: 1 hour)
        self.token_ttl: int = int(os.getenv("ANONIMIZADOR_TOKEN_TTL", "3600"))

        # Maximum upload file size in bytes (default: 100MB)
        self.max_upload_size: int = int(
            os.getenv("ANONIMIZADOR_MAX_UPLOAD_SIZE", str(100 * 1024 * 1024))
        )

        # Storage directory for encrypted files
        self.storage_dir: Path = Path(
            os.getenv("ANONIMIZADOR_STORAGE_DIR", "/var/anonimizador/storage")
        )

        # Master key for encrypting file keys (32 bytes for AES-256)
        # In production, this MUST be set via environment variable
        master_key_env = os.getenv("ANONIMIZADOR_MASTER_KEY")
        if master_key_env:
            self.master_key: bytes = bytes.fromhex(master_key_env)
        else:
            # Generate a random key for development (NOT for production)
            self.master_key = secrets.token_bytes(32)

        # JWT secret for token signing
        jwt_secret_env = os.getenv("ANONIMIZADOR_JWT_SECRET")
        if jwt_secret_env:
            self.jwt_secret: str = jwt_secret_env
        else:
            # Generate a random secret for development (NOT for production)
            self.jwt_secret = secrets.token_hex(32)

        # File expiration time in seconds (default: 24 hours)
        self.file_expiration: int = int(
            os.getenv("ANONIMIZADOR_FILE_EXPIRATION", str(24 * 3600))
        )

        # Cleanup interval in seconds (default: 1 hour)
        self.cleanup_interval: int = int(
            os.getenv("ANONIMIZADOR_CLEANUP_INTERVAL", "3600")
        )

        # n8n webhook URL for notifications (optional)
        self.n8n_webhook_url: str | None = os.getenv("ANONIMIZADOR_N8N_WEBHOOK_URL")

        # Allowed file extensions (comma-separated)
        allowed_ext = os.getenv(
            "ANONIMIZADOR_ALLOWED_EXTENSIONS",
            ".jpg,.jpeg,.png,.gif,.bmp,.pdf,.docx,.xlsx",
        )
        self.allowed_extensions: set[str] = set(allowed_ext.lower().split(","))

    def ensure_storage_dir(self) -> None:
        """Create storage directory with restricted permissions if it doesn't exist."""
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        # Set restrictive permissions (owner only: rwx)
        self.storage_dir.chmod(0o700)


# Global settings instance
settings = Settings()
