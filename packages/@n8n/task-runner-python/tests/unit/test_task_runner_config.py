from unittest.mock import patch

from src.config.task_runner_config import TaskRunnerConfig


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
