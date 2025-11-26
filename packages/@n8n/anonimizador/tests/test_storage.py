"""Tests for the storage module."""

import json
import tempfile
import time
from pathlib import Path
from unittest import mock

import pytest

from app.storage import StorageManager


@pytest.fixture
def temp_storage_dir():
    """Create a temporary storage directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def storage_manager(temp_storage_dir):
    """Create a StorageManager with test configuration."""
    with mock.patch("app.storage.settings") as mock_settings:
        mock_settings.storage_dir = temp_storage_dir
        mock_settings.master_key = b"0" * 32  # 32-byte test key
        mock_settings.jwt_secret = "test-secret"
        mock_settings.token_ttl = 3600
        mock_settings.file_expiration = 86400
        mock_settings.cleanup_interval = 3600
        mock_settings.n8n_webhook_url = None

        manager = StorageManager()
        manager.storage_dir = temp_storage_dir
        yield manager


class TestStorageManager:
    """Tests for the StorageManager class."""

    def test_store_file_creates_encrypted_file(self, storage_manager, temp_storage_dir):
        """Test that storing a file creates encrypted data."""
        test_data = b"Hello, World!"
        file_id, token = storage_manager.store_file(test_data, "test.txt")

        # Verify files were created
        enc_file = temp_storage_dir / f"{file_id}.enc"
        meta_file = temp_storage_dir / f"{file_id}.meta"

        assert enc_file.exists()
        assert meta_file.exists()

        # Verify encrypted data is different from original
        encrypted_data = enc_file.read_bytes()
        assert encrypted_data != test_data

        # Verify metadata contains expected fields
        metadata = json.loads(meta_file.read_text())
        assert "encrypted_key" in metadata
        assert metadata["original_filename"] == "test.txt"
        assert "created_at" in metadata
        assert "expires_at" in metadata
        assert metadata["size"] == len(test_data)

    def test_store_and_retrieve_file(self, storage_manager):
        """Test storing and retrieving a file."""
        test_data = b"Test file content for encryption"
        filename = "document.pdf"

        file_id, token = storage_manager.store_file(test_data, filename)

        result = storage_manager.retrieve_file(file_id)
        assert result is not None

        retrieved_data, retrieved_filename = result
        assert retrieved_data == test_data
        assert retrieved_filename == filename

    def test_validate_token_valid(self, storage_manager):
        """Test token validation with a valid token."""
        test_data = b"Test data"
        file_id, token = storage_manager.store_file(test_data, "test.txt")

        validated_id = storage_manager.validate_token(token)
        assert validated_id == file_id

    def test_validate_token_invalid(self, storage_manager):
        """Test token validation with an invalid token."""
        result = storage_manager.validate_token("invalid-token")
        assert result is None

    def test_retrieve_nonexistent_file(self, storage_manager):
        """Test retrieving a file that doesn't exist."""
        result = storage_manager.retrieve_file("nonexistent-file-id")
        assert result is None

    def test_get_file_info(self, storage_manager):
        """Test getting file information."""
        test_data = b"Test data for info"
        file_id, _ = storage_manager.store_file(test_data, "info-test.txt")

        info = storage_manager.get_file_info(file_id)
        assert info is not None
        assert info["file_id"] == file_id
        assert info["original_filename"] == "info-test.txt"
        assert info["size"] == len(test_data)
        assert info["is_expired"] is False

    def test_get_file_info_nonexistent(self, storage_manager):
        """Test getting info for nonexistent file."""
        info = storage_manager.get_file_info("nonexistent-id")
        assert info is None

    def test_delete_file(self, storage_manager, temp_storage_dir):
        """Test file deletion."""
        test_data = b"Test data to delete"
        file_id, _ = storage_manager.store_file(test_data, "delete-test.txt")

        # Verify files exist
        enc_file = temp_storage_dir / f"{file_id}.enc"
        meta_file = temp_storage_dir / f"{file_id}.meta"
        assert enc_file.exists()
        assert meta_file.exists()

        # Delete the file
        result = storage_manager.delete_file(file_id)
        assert result is True

        # Verify files are gone
        assert not enc_file.exists()
        assert not meta_file.exists()


class TestCleanup:
    """Tests for the cleanup functionality."""

    @pytest.mark.asyncio
    async def test_cleanup_expired_files(self, storage_manager, temp_storage_dir):
        """Test that expired files are cleaned up."""
        # Store a file
        test_data = b"Expired file data"
        file_id, _ = storage_manager.store_file(test_data, "expired.txt")

        # Manually set the file to be expired
        meta_file = temp_storage_dir / f"{file_id}.meta"
        metadata = json.loads(meta_file.read_text())
        metadata["expires_at"] = time.time() - 3600  # Expired 1 hour ago
        meta_file.write_text(json.dumps(metadata))

        # Run cleanup
        stats = await storage_manager.cleanup_expired_files()

        assert stats["checked"] == 1
        assert stats["deleted"] == 1
        assert stats["errors"] == 0

        # Verify file is deleted
        enc_file = temp_storage_dir / f"{file_id}.enc"
        assert not enc_file.exists()
        assert not meta_file.exists()

    @pytest.mark.asyncio
    async def test_cleanup_keeps_valid_files(self, storage_manager, temp_storage_dir):
        """Test that valid files are not cleaned up."""
        test_data = b"Valid file data"
        file_id, _ = storage_manager.store_file(test_data, "valid.txt")

        # Run cleanup
        stats = await storage_manager.cleanup_expired_files()

        assert stats["checked"] == 1
        assert stats["deleted"] == 0
        assert stats["errors"] == 0

        # Verify file still exists
        enc_file = temp_storage_dir / f"{file_id}.enc"
        assert enc_file.exists()
