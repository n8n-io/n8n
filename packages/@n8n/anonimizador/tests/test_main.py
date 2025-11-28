"""Tests for the FastAPI application endpoints."""

import io
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.storage import StorageManager


@pytest.fixture
def temp_storage_dir():
    """Create a temporary storage directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir)
        path.mkdir(parents=True, exist_ok=True)
        yield path


@pytest.fixture
def test_settings(temp_storage_dir):
    """Create test settings with temporary storage."""
    settings = Settings.__new__(Settings)
    settings.storage_dir = temp_storage_dir
    settings.master_key = bytes.fromhex("0" * 64)
    settings.jwt_secret = "test-secret-key"
    settings.token_ttl = 3600
    settings.file_expiration = 86400
    settings.max_upload_size = 10 * 1024 * 1024
    settings.cleanup_interval = 3600
    settings.n8n_webhook_url = None
    settings.allowed_extensions = {
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".pdf",
        ".docx",
        ".xlsx",
    }
    return settings


@pytest.fixture
def test_storage_manager(test_settings):
    """Create a StorageManager with test settings."""
    manager = StorageManager.__new__(StorageManager)
    manager.storage_dir = test_settings.storage_dir
    manager.master_key = test_settings.master_key

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    manager.aesgcm = AESGCM(manager.master_key)
    manager._cleanup_task = None
    return manager


@pytest.fixture
def client(test_settings, test_storage_manager, monkeypatch):
    """Create a test client for the FastAPI app."""
    # Patch the settings and storage_manager before importing the app
    import app.config
    import app.main
    import app.storage

    monkeypatch.setattr(app.config, "settings", test_settings)
    monkeypatch.setattr(app.storage, "settings", test_settings)
    monkeypatch.setattr(app.storage, "storage_manager", test_storage_manager)
    monkeypatch.setattr(app.main, "settings", test_settings)
    monkeypatch.setattr(app.main, "storage_manager", test_storage_manager)

    # Also patch ensure_storage_dir to not fail
    def ensure_storage_dir():
        test_settings.storage_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(test_settings, "ensure_storage_dir", ensure_storage_dir)

    with TestClient(app.main.app) as test_client:
        yield test_client


def create_test_image(fmt: str = "JPEG") -> bytes:
    """Create a test image for uploads."""
    img = Image.new("RGB", (100, 100), color="red")
    buffer = io.BytesIO()
    img.save(buffer, format=fmt)
    buffer.seek(0)
    return buffer.getvalue()


class TestHealthCheck:
    """Tests for the health check endpoint."""

    def test_health_check_returns_healthy(self, client):
        """Test that health check returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestInfo:
    """Tests for the info endpoint."""

    def test_info_returns_configuration(self, client):
        """Test that info endpoint returns configuration."""
        response = client.get("/info")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "max_upload_size" in data
        assert "supported_extensions" in data


class TestUpload:
    """Tests for the upload endpoint."""

    def test_upload_valid_image(self, client):
        """Test uploading a valid JPEG image."""
        image_data = create_test_image("JPEG")

        response = client.post(
            "/upload",
            files={"file": ("test.jpg", image_data, "image/jpeg")},
        )

        assert response.status_code == 200
        data = response.json()
        assert "file_id" in data
        assert "download_token" in data
        assert "token_expires_in_seconds" in data
        assert "file_expires_in_seconds" in data
        assert data["original_size"] > 0
        assert data["sanitized_size"] > 0

    def test_upload_png_image(self, client):
        """Test uploading a PNG image."""
        image_data = create_test_image("PNG")

        response = client.post(
            "/upload",
            files={"file": ("test.png", image_data, "image/png")},
        )

        assert response.status_code == 200
        data = response.json()
        assert "file_id" in data

    def test_upload_invalid_extension(self, client):
        """Test that invalid file extensions are rejected."""
        response = client.post(
            "/upload",
            files={"file": ("test.txt", b"text content", "text/plain")},
        )

        assert response.status_code == 400
        data = response.json()
        assert "extension not allowed" in data["detail"].lower()

    def test_upload_without_filename(self, client):
        """Test that uploads without filename are rejected."""
        image_data = create_test_image("JPEG")

        # FastAPI returns 422 for validation errors when filename is empty
        response = client.post(
            "/upload",
            files={"file": ("", image_data, "image/jpeg")},
        )

        # Accept either 400 (our validation) or 422 (FastAPI validation)
        assert response.status_code in (400, 422)


class TestDownload:
    """Tests for the download endpoint."""

    def test_download_with_valid_token(self, client):
        """Test downloading a file with a valid token."""
        # First upload a file
        image_data = create_test_image("JPEG")
        upload_response = client.post(
            "/upload",
            files={"file": ("test.jpg", image_data, "image/jpeg")},
        )
        assert upload_response.status_code == 200
        token = upload_response.json()["download_token"]

        # Then download it
        download_response = client.get(f"/download?token={token}")
        assert download_response.status_code == 200
        assert download_response.headers["content-type"] == "image/jpeg"

    def test_download_with_invalid_token(self, client):
        """Test that invalid tokens are rejected."""
        response = client.get("/download?token=invalid-token")
        assert response.status_code == 401

    def test_download_without_token(self, client):
        """Test that missing token returns an error."""
        response = client.get("/download")
        assert response.status_code == 422  # Validation error


class TestFileInfo:
    """Tests for the file info endpoint."""

    def test_get_file_info(self, client):
        """Test getting file information."""
        # Upload a file first
        image_data = create_test_image("JPEG")
        upload_response = client.post(
            "/upload",
            files={"file": ("info-test.jpg", image_data, "image/jpeg")},
        )
        file_id = upload_response.json()["file_id"]

        # Get file info
        info_response = client.get(f"/file/{file_id}/info")
        assert info_response.status_code == 200
        data = info_response.json()
        assert data["file_id"] == file_id
        assert data["original_filename"] == "info-test.jpg"
        assert data["is_expired"] is False

    def test_get_nonexistent_file_info(self, client):
        """Test getting info for nonexistent file."""
        response = client.get("/file/nonexistent-id/info")
        assert response.status_code == 404


class TestRefreshToken:
    """Tests for the token refresh endpoint."""

    def test_refresh_token(self, client):
        """Test refreshing a download token."""
        # Upload a file first
        image_data = create_test_image("JPEG")
        upload_response = client.post(
            "/upload",
            files={"file": ("refresh-test.jpg", image_data, "image/jpeg")},
        )
        file_id = upload_response.json()["file_id"]
        original_token = upload_response.json()["download_token"]

        # Refresh the token
        refresh_response = client.post(f"/file/{file_id}/token")
        assert refresh_response.status_code == 200
        data = refresh_response.json()
        assert data["file_id"] == file_id
        assert "download_token" in data
        # New token should be different
        assert data["download_token"] != original_token

    def test_refresh_token_nonexistent_file(self, client):
        """Test refreshing token for nonexistent file."""
        response = client.post("/file/nonexistent-id/token")
        assert response.status_code == 404


class TestCleanup:
    """Tests for the cleanup endpoint."""

    def test_manual_cleanup(self, client):
        """Test manual cleanup trigger."""
        response = client.post("/admin/cleanup")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "stats" in data
