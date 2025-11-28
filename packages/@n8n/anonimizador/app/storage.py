"""Secure storage management with encryption and automatic cleanup."""

import asyncio
import json
import secrets
import time
from datetime import UTC, datetime
from typing import Any

import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from jose import jwt

from .config import settings


class StorageManager:
    """Manages encrypted file storage with automatic cleanup."""

    def __init__(self) -> None:
        self.storage_dir = settings.storage_dir
        self.master_key = settings.master_key
        self.aesgcm = AESGCM(self.master_key)
        self._cleanup_task: asyncio.Task[None] | None = None

    def _generate_file_key(self) -> bytes:
        """Generate a random 256-bit key for file encryption."""
        return secrets.token_bytes(32)

    def _encrypt_file_key(self, file_key: bytes) -> bytes:
        """Encrypt the file key using the master key."""
        nonce = secrets.token_bytes(12)
        ciphertext = self.aesgcm.encrypt(nonce, file_key, None)
        return nonce + ciphertext

    def _decrypt_file_key(self, encrypted_key: bytes) -> bytes:
        """Decrypt the file key using the master key."""
        nonce = encrypted_key[:12]
        ciphertext = encrypted_key[12:]
        return self.aesgcm.decrypt(nonce, ciphertext, None)

    def _encrypt_file(self, data: bytes, file_key: bytes) -> bytes:
        """Encrypt file data using the file-specific key."""
        file_aesgcm = AESGCM(file_key)
        nonce = secrets.token_bytes(12)
        ciphertext = file_aesgcm.encrypt(nonce, data, None)
        return nonce + ciphertext

    def _decrypt_file(self, encrypted_data: bytes, file_key: bytes) -> bytes:
        """Decrypt file data using the file-specific key."""
        file_aesgcm = AESGCM(file_key)
        nonce = encrypted_data[:12]
        ciphertext = encrypted_data[12:]
        return file_aesgcm.decrypt(nonce, ciphertext, None)

    def store_file(self, data: bytes, original_filename: str) -> tuple[str, str]:
        """
        Store an encrypted file and return its ID and download token.

        Args:
            data: File data to store
            original_filename: Original filename for metadata

        Returns:
            Tuple of (file_id, download_token)
        """
        settings.ensure_storage_dir()

        # Generate unique file ID
        file_id = secrets.token_urlsafe(32)

        # Generate file-specific encryption key
        file_key = self._generate_file_key()

        # Encrypt the file
        encrypted_data = self._encrypt_file(data, file_key)

        # Encrypt the file key with master key
        encrypted_file_key = self._encrypt_file_key(file_key)

        # Create file path
        file_path = self.storage_dir / f"{file_id}.enc"
        meta_path = self.storage_dir / f"{file_id}.meta"

        # Store encrypted file with restricted permissions
        file_path.write_bytes(encrypted_data)
        file_path.chmod(0o600)

        # Store metadata (encrypted key, expiration, etc.)
        expiration_time = time.time() + settings.file_expiration
        metadata = {
            "encrypted_key": encrypted_file_key.hex(),
            "original_filename": original_filename,
            "created_at": datetime.now(UTC).isoformat(),
            "expires_at": expiration_time,
            "size": len(data),
        }
        meta_path.write_text(json.dumps(metadata))
        meta_path.chmod(0o600)

        # Generate download token
        download_token = self.generate_download_token(file_id)

        return file_id, download_token

    def generate_download_token(self, file_id: str) -> str:
        """
        Generate a JWT token for file download.

        Args:
            file_id: ID of the file to generate token for

        Returns:
            JWT token string for downloading the file
        """
        expiration = datetime.now(UTC).timestamp() + settings.token_ttl
        payload = {
            "file_id": file_id,
            "exp": expiration,
            "iat": datetime.now(UTC).timestamp(),
            "jti": secrets.token_urlsafe(16),
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

    def validate_token(self, token: str) -> str | None:
        """
        Validate a download token and return the file ID.

        Args:
            token: JWT download token

        Returns:
            File ID if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
            return str(payload.get("file_id"))
        except jwt.JWTError:
            return None

    def retrieve_file(self, file_id: str) -> tuple[bytes, str] | None:
        """
        Retrieve and decrypt a stored file.

        Args:
            file_id: ID of the file to retrieve

        Returns:
            Tuple of (file_data, original_filename) or None if not found
        """
        file_path = self.storage_dir / f"{file_id}.enc"
        meta_path = self.storage_dir / f"{file_id}.meta"

        if not file_path.exists() or not meta_path.exists():
            return None

        # Load and validate metadata
        try:
            metadata = json.loads(meta_path.read_text())
        except (json.JSONDecodeError, OSError):
            return None

        # Check if file has expired
        if time.time() > metadata["expires_at"]:
            # Clean up expired file
            self.delete_file(file_id)
            return None

        # Decrypt file key
        encrypted_key = bytes.fromhex(metadata["encrypted_key"])
        file_key = self._decrypt_file_key(encrypted_key)

        # Read and decrypt file
        encrypted_data = file_path.read_bytes()
        file_data = self._decrypt_file(encrypted_data, file_key)

        return file_data, metadata["original_filename"]

    def delete_file(self, file_id: str) -> bool:
        """
        Delete a file and its metadata from storage.

        Args:
            file_id: ID of the file to delete

        Returns:
            True if any files were deleted, False otherwise
        """
        file_path = self.storage_dir / f"{file_id}.enc"
        meta_path = self.storage_dir / f"{file_id}.meta"

        deleted = False
        if file_path.exists():
            file_path.unlink()
            deleted = True
        if meta_path.exists():
            meta_path.unlink()
            deleted = True

        return deleted

    async def cleanup_expired_files(self) -> dict[str, Any]:
        """
        Clean up expired files from storage.

        Returns:
            Statistics about the cleanup operation
        """
        stats = {
            "checked": 0,
            "deleted": 0,
            "errors": 0,
            "failed_files": [],
        }

        if not self.storage_dir.exists():
            return stats

        current_time = time.time()

        for meta_file in self.storage_dir.glob("*.meta"):
            stats["checked"] += 1
            try:
                metadata = json.loads(meta_file.read_text())
                if current_time > metadata["expires_at"]:
                    file_id = meta_file.stem
                    if self.delete_file(file_id):
                        stats["deleted"] += 1
                    else:
                        stats["errors"] += 1
                        stats["failed_files"].append(file_id)
            except (json.JSONDecodeError, OSError, KeyError):
                stats["errors"] += 1
                stats["failed_files"].append(meta_file.stem)

        # Notify n8n if there were errors and webhook is configured
        if stats["errors"] > 0 and settings.n8n_webhook_url:
            await self._notify_n8n(stats)

        return stats

    async def _notify_n8n(self, stats: dict[str, Any]) -> None:
        """Send notification to n8n webhook about cleanup issues."""
        if not settings.n8n_webhook_url:
            return

        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    settings.n8n_webhook_url,
                    json={
                        "event": "cleanup_errors",
                        "timestamp": datetime.now(UTC).isoformat(),
                        "stats": stats,
                    },
                    timeout=10.0,
                )
        except httpx.HTTPError:
            # Log error but don't fail the cleanup
            pass

    async def _cleanup_loop(self) -> None:
        """Background task for periodic cleanup."""
        while True:
            await asyncio.sleep(settings.cleanup_interval)
            await self.cleanup_expired_files()

    def start_cleanup_task(self) -> None:
        """Start the background cleanup task."""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    def stop_cleanup_task(self) -> None:
        """Stop the background cleanup task."""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()

    def get_file_info(self, file_id: str) -> dict[str, Any] | None:
        """Get metadata about a stored file."""
        meta_path = self.storage_dir / f"{file_id}.meta"

        if not meta_path.exists():
            return None

        try:
            metadata = json.loads(meta_path.read_text())
            return {
                "file_id": file_id,
                "original_filename": metadata["original_filename"],
                "created_at": metadata["created_at"],
                "expires_at": datetime.fromtimestamp(
                    metadata["expires_at"], tz=UTC
                ).isoformat(),
                "size": metadata["size"],
                "is_expired": time.time() > metadata["expires_at"],
            }
        except (json.JSONDecodeError, OSError, KeyError):
            return None


# Global storage manager instance
storage_manager = StorageManager()
