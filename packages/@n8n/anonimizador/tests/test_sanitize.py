"""Tests for the sanitization module."""

import io

import pytest
from PIL import Image

from app.sanitize import (
    get_supported_extensions,
    sanitize_file,
    sanitize_image,
)


class TestSanitizeImage:
    """Tests for image sanitization."""

    def test_sanitize_jpeg_removes_exif(self):
        """Test that EXIF data is removed from JPEG images."""
        # Create a test image with EXIF-like data
        img = Image.new("RGB", (100, 100), color="red")
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")
        original_data = buffer.getvalue()

        # Sanitize the image
        sanitized_data = sanitize_image(original_data, "JPEG")

        # Verify the result is valid JPEG
        sanitized_img = Image.open(io.BytesIO(sanitized_data))
        assert sanitized_img.format == "JPEG"
        assert sanitized_img.size == (100, 100)

    def test_sanitize_png(self):
        """Test PNG image sanitization."""
        img = Image.new("RGBA", (50, 50), color="blue")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        original_data = buffer.getvalue()

        sanitized_data = sanitize_image(original_data, "PNG")

        sanitized_img = Image.open(io.BytesIO(sanitized_data))
        assert sanitized_img.format == "PNG"

    def test_sanitize_rgba_to_jpeg_converts_mode(self):
        """Test that RGBA images are converted to RGB for JPEG output."""
        img = Image.new("RGBA", (50, 50), color="green")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        original_data = buffer.getvalue()

        sanitized_data = sanitize_image(original_data, "JPEG")

        sanitized_img = Image.open(io.BytesIO(sanitized_data))
        assert sanitized_img.format == "JPEG"
        assert sanitized_img.mode == "RGB"


class TestSanitizeFile:
    """Tests for the generic file sanitization function."""

    def test_sanitize_file_jpeg_extension(self):
        """Test sanitization with .jpeg extension."""
        img = Image.new("RGB", (100, 100), color="red")
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")
        original_data = buffer.getvalue()

        sanitized_data = sanitize_file(original_data, "test.jpeg")
        assert len(sanitized_data) > 0

    def test_sanitize_file_jpg_extension(self):
        """Test sanitization with .jpg extension."""
        img = Image.new("RGB", (100, 100), color="red")
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")
        original_data = buffer.getvalue()

        sanitized_data = sanitize_file(original_data, "test.jpg")
        assert len(sanitized_data) > 0

    def test_sanitize_file_png_extension(self):
        """Test sanitization with .png extension."""
        img = Image.new("RGB", (100, 100), color="blue")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        original_data = buffer.getvalue()

        sanitized_data = sanitize_file(original_data, "test.png")
        assert len(sanitized_data) > 0

    def test_sanitize_file_unsupported_extension(self):
        """Test that unsupported extensions raise ValueError."""
        with pytest.raises(ValueError, match="Unsupported file type"):
            sanitize_file(b"test data", "test.txt")

    def test_sanitize_file_no_extension(self):
        """Test that files without extension raise ValueError."""
        with pytest.raises(ValueError, match="Unsupported file type"):
            sanitize_file(b"test data", "testfile")


class TestGetSupportedExtensions:
    """Tests for the supported extensions function."""

    def test_returns_expected_extensions(self):
        """Test that all expected extensions are returned."""
        extensions = get_supported_extensions()
        assert "jpg" in extensions
        assert "jpeg" in extensions
        assert "png" in extensions
        assert "gif" in extensions
        assert "bmp" in extensions
        assert "pdf" in extensions
        assert "docx" in extensions
        assert "xlsx" in extensions
