
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
        with patch.dict(os.environ, {
            "N8N_RUNNERS_GRANT_TOKEN": "test_token",
            "N8N_RUNNERS_STDLIB_ALLOW": ""
        }, clear=True):
            config = TaskRunnerConfig.from_env()
            assert config.stdlib_allow == set()
