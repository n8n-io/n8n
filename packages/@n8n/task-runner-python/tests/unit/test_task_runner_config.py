from unittest.mock import patch

import pytest

from src.config.task_runner_config import TaskRunnerConfig
from src.errors import ConfigurationError


class TestEnvAllowParsing:
    @patch.dict(
        "os.environ",
        {"N8N_RUNNERS_GRANT_TOKEN": "test-token"},
        clear=True,
    )
    def test_defaults_to_empty_set_when_unset(self):
        config = TaskRunnerConfig.from_env()

        assert config.env_allow == set()

    @patch.dict(
        "os.environ",
        {
            "N8N_RUNNERS_GRANT_TOKEN": "test-token",
            "N8N_RUNNER_ENV_ALLOW": "",
        },
        clear=True,
    )
    def test_empty_string_yields_empty_set(self):
        config = TaskRunnerConfig.from_env()

        assert config.env_allow == set()

    @patch.dict(
        "os.environ",
        {
            "N8N_RUNNERS_GRANT_TOKEN": "test-token",
            "N8N_RUNNER_ENV_ALLOW": "  FOO , , BAR ,  ",
        },
        clear=True,
    )
    def test_strips_whitespace_and_skips_empty_entries(self):
        config = TaskRunnerConfig.from_env()

        assert config.env_allow == {"FOO", "BAR"}

    @patch.dict(
        "os.environ",
        {
            "N8N_RUNNERS_GRANT_TOKEN": "test-token",
            "N8N_RUNNER_ENV_ALLOW": "FOO,BAR,BAZ",
        },
        clear=True,
    )
    def test_parses_multiple_entries(self):
        config = TaskRunnerConfig.from_env()

        assert config.env_allow == {"FOO", "BAR", "BAZ"}

    @patch.dict(
        "os.environ",
        {
            "N8N_RUNNERS_GRANT_TOKEN": "test-token",
            "N8N_BLOCK_RUNNER_ENV_ACCESS": "false",
            "N8N_RUNNER_ENV_ALLOW": "*,FOO",
        },
        clear=True,
    )
    def test_ignores_allowlist_when_env_access_not_blocked(self):
        config = TaskRunnerConfig.from_env()

        assert config.env_allow == set()

    @patch.dict(
        "os.environ",
        {
            "N8N_RUNNERS_GRANT_TOKEN": "test-token",
            "N8N_RUNNER_ENV_ALLOW": "*,FOO",
        },
        clear=True,
    )
    def test_rejects_wildcard_mixed_with_other_entries_when_blocked(self):
        with pytest.raises(ConfigurationError):
            TaskRunnerConfig.from_env()
