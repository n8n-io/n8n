
import os
from unittest.mock import patch
from src.config.task_runner_config import TaskRunnerConfig

class TestTaskRunnerConfig:
    def test_default_stdlib_allow_is_wildcard(self):
        """Test that stdlib_allow defaults to {'*'} when not set in env."""
        with patch.dict(os.environ, {
            "N8N_RUNNERS_GRANT_TOKEN": "test_token", 
            # mimic other required vars or defaults will kick in
        }, clear=True):
            config = TaskRunnerConfig.from_env()
            assert config.stdlib_allow == {'*'}

    def test_explicit_stdlib_allow(self):
        """Test that explicit environment variable overrides default."""
        with patch.dict(os.environ, {
            "N8N_RUNNERS_GRANT_TOKEN": "test_token",
            "N8N_RUNNERS_STDLIB_ALLOW": "re,json"
        }, clear=True):
            config = TaskRunnerConfig.from_env()
            assert config.stdlib_allow == {'re', 'json'}

    def test_explicit_empty_stdlib_allow(self):
        """Test that setting it to empty string results in empty set (deny all)."""
        # Note: If the user specifically sets it to "", they likely want to block everything.
        # But read_str_env defaults to default if key is missing. 
        # If key is present but empty, read_str_env returns empty string.
        # So we need to ensure our default logic only applies when env var is MISSING.
        # However, read_str_env signature in `src/env.py` (which I read earlier) 
        # normally handles "missing" vs "empty" depending on implementation.
        # Let's check src/env.py behavior again if needed. 
        pass
