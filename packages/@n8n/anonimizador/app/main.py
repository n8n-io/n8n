"""FastAPI main application for secure file anonymization and transfer."""

import os
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response

from .config import settings
from .sanitize import get_supported_extensions, sanitize_file
from .storage import storage_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup: ensure storage directory exists and start cleanup task
    settings.ensure_storage_dir()
    storage_manager.start_cleanup_task()
    yield
    # Shutdown: stop cleanup task
    storage_manager.stop_cleanup_task()


app = FastAPI(
    title="Anonimizador",
    description="Secure anonymization and file transfer service",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/info")
async def get_info() -> dict[str, Any]:
    """Get service configuration info."""
    return {
        "version": "0.1.0",
        "max_upload_size": settings.max_upload_size,
        "max_upload_size_mb": settings.max_upload_size / (1024 * 1024),
        "token_ttl_seconds": settings.token_ttl,
        "file_expiration_seconds": settings.file_expiration,
        "supported_extensions": get_supported_extensions(),
        "n8n_integration_enabled": settings.n8n_webhook_url is not None,
    }


@app.post("/upload")
async def upload_file(
    file: Annotated[UploadFile, File(description="File to upload and anonymize")],
) -> dict[str, Any]:
    """
    Upload a file for anonymization and secure storage.

    The file will be:
    1. Validated for allowed extensions and size
    2. Sanitized to remove all metadata
    3. Encrypted with a unique key
    4. Stored securely with restricted permissions

    Returns a file ID and a download token with configurable TTL.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    # Validate file extension
    ext = "." + file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in settings.allowed_extensions:
        allowed = list(settings.allowed_extensions)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension not allowed. Allowed: {allowed}",
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > settings.max_upload_size:
        max_size_mb = settings.max_upload_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {max_size_mb:.1f}MB",
        )

    try:
        # Sanitize file (remove metadata)
        sanitized_content = sanitize_file(content, file.filename)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing file. The file may be corrupted or invalid.",
        ) from e

    # Store encrypted file
    file_id, download_token = storage_manager.store_file(
        sanitized_content, file.filename
    )

    return {
        "file_id": file_id,
        "download_token": download_token,
        "token_expires_in_seconds": settings.token_ttl,
        "file_expires_in_seconds": settings.file_expiration,
        "original_size": len(content),
        "sanitized_size": len(sanitized_content),
    }


@app.get("/download")
async def download_file(
    token: Annotated[str, Query(description="Download token")],
) -> Response:
    """
    Download a file using a valid download token.

    The token is validated for:
    - Valid signature
    - Not expired
    - Associated file exists

    Returns the decrypted file with appropriate content type.
    """
    # Validate token
    file_id = storage_manager.validate_token(token)
    if not file_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired download token",
        )

    # Retrieve file
    result = storage_manager.retrieve_file(file_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or has expired",
        )

    file_data, original_filename = result

    # Determine content type
    ext = original_filename.lower().split(".")[-1] if "." in original_filename else ""
    docx_type = (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    xlsx_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    content_types = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "bmp": "image/bmp",
        "pdf": "application/pdf",
        "docx": docx_type,
        "xlsx": xlsx_type,
    }
    content_type = content_types.get(ext, "application/octet-stream")

    return Response(
        content=file_data,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{original_filename}"',
            "X-File-Id": file_id,
        },
    )


@app.get("/file/{file_id}/info")
async def get_file_info(file_id: str) -> dict[str, Any]:
    """Get information about a stored file."""
    info = storage_manager.get_file_info(file_id)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    return info


@app.post("/file/{file_id}/token")
async def refresh_download_token(file_id: str) -> dict[str, Any]:
    """
    Generate a new download token for an existing file.

    This allows extending access without re-uploading the file.
    """
    info = storage_manager.get_file_info(file_id)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    if info["is_expired"]:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="File has expired and cannot be accessed",
        )

    download_token = storage_manager._generate_download_token(file_id)
    return {
        "file_id": file_id,
        "download_token": download_token,
        "token_expires_in_seconds": settings.token_ttl,
    }


@app.post("/admin/cleanup")
async def trigger_cleanup() -> dict[str, Any]:
    """
    Manually trigger cleanup of expired files.

    This is useful for administrative purposes or testing.
    In production, cleanup runs automatically in the background.
    """
    stats = await storage_manager.cleanup_expired_files()
    return {
        "message": "Cleanup completed",
        "stats": stats,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=os.getenv("ANONIMIZADOR_HOST", "0.0.0.0"),  # noqa: S104
        port=int(os.getenv("ANONIMIZADOR_PORT", "8000")),
        reload=os.getenv("ANONIMIZADOR_DEBUG", "false").lower() == "true",
    )
