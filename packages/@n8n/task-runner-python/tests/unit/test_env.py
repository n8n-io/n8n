import os
import tempfile
from pathlib import Path
import pytest
from unittest.mock import patch

from src.env import read_env


class TestReadEnv:
    def test_returns_direct_env_var_when_exists(self):
        with patch.dict(os.environ, {"TEST_VAR": "direct_value"}):
            result = read_env("TEST_VAR")
            assert result == "direct_value"

    def test_returns_none_when_no_env_var(self):
        with patch.dict(os.environ, clear=True):
            result = read_env("NONEXISTENT_VAR")
            assert result is None

    def test_reads_from_file_when_file_env_var_exists(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write("file_value\n")
            temp_file_path = f.name

        try:
            with patch.dict(os.environ, {"TEST_VAR_FILE": temp_file_path}):
                result = read_env("TEST_VAR")
                assert result == "file_value"
        finally:
            Path(temp_file_path).unlink()

    def test_strips_whitespace_from_file_content(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write("  value_with_spaces  \n\n")
            temp_file_path = f.name

        try:
            with patch.dict(os.environ, {"TEST_VAR_FILE": temp_file_path}):
                result = read_env("TEST_VAR")
                assert result == "value_with_spaces"
        finally:
            Path(temp_file_path).unlink()

    def test_direct_env_var_takes_precedence_over_file(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write("file_value")
            temp_file_path = f.name

        try:
            with patch.dict(
                os.environ,
                {"TEST_VAR": "direct_value", "TEST_VAR_FILE": temp_file_path},
            ):
                result = read_env("TEST_VAR")
                assert result == "direct_value"
        finally:
            Path(temp_file_path).unlink()

    def test_raises_error_when_file_not_found(self):
        with patch.dict(os.environ, {"TEST_VAR_FILE": "/nonexistent/file.txt"}):
            with pytest.raises(ValueError) as exc_info:
                read_env("TEST_VAR")
            assert "Failed to read TEST_VAR from file" in str(exc_info.value)

    def test_handles_empty_file(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write("")
            temp_file_path = f.name

        try:
            with patch.dict(os.environ, {"TEST_VAR_FILE": temp_file_path}):
                result = read_env("TEST_VAR")
                assert result == ""
        finally:
            Path(temp_file_path).unlink()

    def test_handles_multiline_file_content(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write("line1\nline2\nline3")
            temp_file_path = f.name

        try:
            with patch.dict(os.environ, {"TEST_VAR_FILE": temp_file_path}):
                result = read_env("TEST_VAR")
                assert result == "line1\nline2\nline3"
        finally:
            Path(temp_file_path).unlink()

    def test_handles_unicode_content(self):
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", delete=False) as f:
            f.write("unicode: 你好世界 🌍")
            temp_file_path = f.name

        try:
            with patch.dict(os.environ, {"TEST_VAR_FILE": temp_file_path}):
                result = read_env("TEST_VAR")
                assert result == "unicode: 你好世界 🌍"
        finally:
            Path(temp_file_path).unlink()

    def test_raises_error_with_permission_denied(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write("secret_value")
            temp_file_path = f.name

        try:
            # Make file unreadable
            Path(temp_file_path).chmod(0o000)
            with patch.dict(os.environ, {"TEST_VAR_FILE": temp_file_path}):
                with pytest.raises(ValueError) as exc_info:
                    read_env("TEST_VAR")
                assert "Failed to read TEST_VAR from file" in str(exc_info.value)
        finally:
            Path(temp_file_path).chmod(0o644)
            Path(temp_file_path).unlink()
