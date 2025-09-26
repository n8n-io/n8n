import os
import tempfile
from pathlib import Path
import pytest
from unittest.mock import patch

from src.env import read_env, read_int_env, read_bool_env, read_str_env


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
        with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
            f.write("file_value\n")
            f.flush()

            with patch.dict(os.environ, {"TEST_VAR_FILE": f.name}):
                result = read_env("TEST_VAR")
                assert result == "file_value"

    def test_strips_whitespace_from_file_content(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
            f.write("  value_with_spaces  \n\n")
            f.flush()

            with patch.dict(os.environ, {"TEST_VAR_FILE": f.name}):
                result = read_env("TEST_VAR")
                assert result == "value_with_spaces"

    def test_direct_env_var_takes_precedence_over_file(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
            f.write("file_value")
            f.flush()

            with patch.dict(
                os.environ,
                {"TEST_VAR": "direct_value", "TEST_VAR_FILE": f.name},
            ):
                result = read_env("TEST_VAR")
                assert result == "direct_value"

    def test_raises_error_when_file_not_found(self):
        with patch.dict(os.environ, {"TEST_VAR_FILE": "/nonexistent/file.txt"}):
            with pytest.raises(ValueError) as exc_info:
                read_env("TEST_VAR")
            assert "Failed to read TEST_VAR_FILE from file" in str(exc_info.value)

    def test_handles_empty_file(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
            f.write("")
            f.flush()

            with patch.dict(os.environ, {"TEST_VAR_FILE": f.name}):
                result = read_env("TEST_VAR")
                assert result == ""

    def test_handles_multiline_file_content(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
            f.write("line1\nline2\nline3")
            f.flush()

            with patch.dict(os.environ, {"TEST_VAR_FILE": f.name}):
                result = read_env("TEST_VAR")
                assert result == "line1\nline2\nline3"

    def test_handles_unicode_content(self):
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", delete=True) as f:
            f.write("unicode: 你好世界 🌍")
            f.flush()

            with patch.dict(os.environ, {"TEST_VAR_FILE": f.name}):
                result = read_env("TEST_VAR")
                assert result == "unicode: 你好世界 🌍"

    def test_raises_error_with_permission_denied(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write("secret_value")
            temp_file_path = f.name

        try:
            Path(temp_file_path).chmod(0o000)  # Make file unreadable
            with patch.dict(os.environ, {"TEST_VAR_FILE": temp_file_path}):
                with pytest.raises(ValueError) as exc_info:
                    read_env("TEST_VAR")
                assert "Failed to read TEST_VAR_FILE from file" in str(exc_info.value)
        finally:
            Path(temp_file_path).chmod(0o644)
            Path(temp_file_path).unlink()


class TestReadStrEnv:
    def test_returns_string_from_direct_env(self):
        with patch.dict(os.environ, {"TEST_STR": "hello world"}):
            result = read_str_env("TEST_STR", default="default")
            assert result == "hello world"

    def test_returns_string_from_file(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
            f.write("file content")
            f.flush()

            with patch.dict(os.environ, {"TEST_STR_FILE": f.name}):
                result = read_str_env("TEST_STR", default="default")
                assert result == "file content"

    def test_returns_default_when_not_set(self):
        with patch.dict(os.environ, clear=True):
            result = read_str_env("TEST_STR", default="fallback")
            assert result == "fallback"

    def test_handles_empty_string_from_env(self):
        with patch.dict(os.environ, {"TEST_STR": ""}):
            result = read_str_env("TEST_STR", default="default")
            assert result == ""


class TestReadIntEnv:
    def test_returns_int_from_direct_env(self):
        with patch.dict(os.environ, {"TEST_INT": "42"}):
            result = read_int_env("TEST_INT", default=0)
            assert result == 42

    def test_returns_int_from_file(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
            f.write("123")
            f.flush()

            with patch.dict(os.environ, {"TEST_INT_FILE": f.name}):
                result = read_int_env("TEST_INT", default=0)
                assert result == 123

    def test_returns_default_when_not_set(self):
        with patch.dict(os.environ, clear=True):
            result = read_int_env("TEST_INT", default=999)
            assert result == 999

    def test_raises_error_for_invalid_int(self):
        with patch.dict(os.environ, {"TEST_INT": "not_a_number"}):
            with pytest.raises(ValueError) as exc_info:
                read_int_env("TEST_INT", default=0)
            assert "must be an integer" in str(exc_info.value)

    def test_handles_negative_numbers(self):
        with patch.dict(os.environ, {"TEST_INT": "-42"}):
            result = read_int_env("TEST_INT", default=0)
            assert result == -42


class TestReadBoolEnv:
    def test_returns_true_for_true_string(self):
        with patch.dict(os.environ, {"TEST_BOOL": "true"}):
            result = read_bool_env("TEST_BOOL", default=False)
            assert result is True

    def test_returns_false_for_false_string(self):
        with patch.dict(os.environ, {"TEST_BOOL": "false"}):
            result = read_bool_env("TEST_BOOL", default=True)
            assert result is False

    def test_returns_true_from_file(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=True) as f:
            f.write("true")
            f.flush()

            with patch.dict(os.environ, {"TEST_BOOL_FILE": f.name}):
                result = read_bool_env("TEST_BOOL", default=False)
                assert result is True

    def test_returns_default_when_not_set(self):
        with patch.dict(os.environ, clear=True):
            result = read_bool_env("TEST_BOOL", default=True)
            assert result is True
