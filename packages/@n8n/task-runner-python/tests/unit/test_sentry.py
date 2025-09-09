import logging
from unittest.mock import Mock, patch

import pytest

from src.config.sentry_config import SentryConfig
from src.errors.task_runtime_error import TaskRuntimeError
from src.sentry import TaskRunnerSentry, setup_sentry
from src.constants import (
    EXECUTOR_ALL_ITEMS_FILENAME,
    EXECUTOR_PER_ITEM_FILENAME,
    LOG_SENTRY_MISSING,
    SENTRY_TAG_SERVER_TYPE_KEY,
    SENTRY_TAG_SERVER_TYPE_VALUE,
)


@pytest.fixture
def sentry_config():
    return SentryConfig(
        dsn="https://test@sentry.io/123456",
        n8n_version="1.0.0",
        environment="test",
        deployment_name="test-deployment",
    )


@pytest.fixture
def disabled_sentry_config():
    return SentryConfig(
        dsn="",
        n8n_version="1.0.0",
        environment="test",
        deployment_name="test-deployment",
    )


class TestTaskRunnerSentry:
    def test_init_configures_sentry_correctly(self, sentry_config):
        with (
            patch("sentry_sdk.init") as mock_init,
            patch("sentry_sdk.set_tag") as mock_set_tag,
            patch("sentry_sdk.integrations.logging.LoggingIntegration") as mock_logging,
        ):
            mock_logging_instance = Mock()
            mock_logging.return_value = mock_logging_instance
            sentry = TaskRunnerSentry(sentry_config)

            sentry.init()

            mock_init.assert_called_once_with(
                dsn="https://test@sentry.io/123456",
                release="n8n@1.0.0",
                environment="test",
                server_name="test-deployment",
                before_send=sentry._filter_out_ignored_errors,
                attach_stacktrace=True,
                send_default_pii=False,
                auto_enabling_integrations=False,
                default_integrations=True,
                integrations=[mock_logging_instance],
            )
            mock_set_tag.assert_called_once_with(
                SENTRY_TAG_SERVER_TYPE_KEY, SENTRY_TAG_SERVER_TYPE_VALUE
            )

    def test_shutdown_flushes_sentry(self, sentry_config):
        with patch("sentry_sdk.flush") as mock_flush:
            sentry = TaskRunnerSentry(sentry_config)

            sentry.shutdown()

            mock_flush.assert_called_once_with(timeout=2.0)

    def test_filter_out_task_runtime_errors(self, sentry_config):
        sentry = TaskRunnerSentry(sentry_config)
        event = {"exception": {"values": []}}
        hint = {"exc_info": (TaskRuntimeError, None, None)}

        result = sentry._filter_out_ignored_errors(event, hint)

        assert result is None

    def test_filter_out_user_code_errors_from_executors(self, sentry_config):
        sentry = TaskRunnerSentry(sentry_config)

        for executor_filename in [
            EXECUTOR_ALL_ITEMS_FILENAME,
            EXECUTOR_PER_ITEM_FILENAME,
        ]:
            event = {
                "exception": {
                    "values": [
                        {
                            "stacktrace": {
                                "frames": [
                                    {"filename": "some_file.py"},
                                    {"filename": executor_filename},
                                ]
                            }
                        }
                    ]
                }
            }
            hint = {}

            result = sentry._filter_out_ignored_errors(event, hint)

            assert result is None

    def test_allows_non_user_code_errors(self, sentry_config):
        sentry = TaskRunnerSentry(sentry_config)
        event = {
            "exception": {
                "values": [
                    {
                        "stacktrace": {
                            "frames": [
                                {"filename": "some_system_file.py"},
                                {"filename": "another_system_file.py"},
                            ]
                        }
                    }
                ]
            }
        }
        hint = {}

        result = sentry._filter_out_ignored_errors(event, hint)

        assert result == event

    def test_handles_malformed_exception_data(self, sentry_config):
        sentry = TaskRunnerSentry(sentry_config)

        test_cases = [
            {},
            {"exception": {"values": []}},
            {"exception": {"values": [{"type": "ValueError"}]}},
            {"exception": {"values": [{"stacktrace": {}}]}},
            {"exception": {"values": [{"stacktrace": {"frames": []}}]}},
        ]

        for event in test_cases:
            result = sentry._filter_out_ignored_errors(event, {})
            assert result == event


class TestSetupSentry:
    def test_returns_none_when_disabled(self, disabled_sentry_config):
        result = setup_sentry(disabled_sentry_config)
        assert result is None

    @patch("src.sentry.TaskRunnerSentry")
    def test_initializes_sentry_when_enabled(self, mock_sentry_class, sentry_config):
        mock_sentry = Mock()
        mock_sentry_class.return_value = mock_sentry

        result = setup_sentry(sentry_config)

        mock_sentry_class.assert_called_once_with(sentry_config)
        mock_sentry.init.assert_called_once()
        assert result == mock_sentry

    @patch("src.sentry.TaskRunnerSentry")
    def test_handles_import_error(self, mock_sentry_class, sentry_config, caplog):
        mock_sentry = Mock()
        mock_sentry.init.side_effect = ImportError("sentry_sdk not found")
        mock_sentry_class.return_value = mock_sentry

        with caplog.at_level(logging.WARNING):
            result = setup_sentry(sentry_config)

        assert result is None
        assert LOG_SENTRY_MISSING in caplog.text

    @patch("src.sentry.TaskRunnerSentry")
    def test_handles_general_exception(self, mock_sentry_class, sentry_config, caplog):
        mock_sentry = Mock()
        mock_sentry.init.side_effect = Exception("Something went wrong")
        mock_sentry_class.return_value = mock_sentry

        with caplog.at_level(logging.WARNING):
            result = setup_sentry(sentry_config)

        assert result is None
        assert "Failed to initialize Sentry: Something went wrong" in caplog.text


class TestSentryConfig:
    def test_enabled_returns_true_with_dsn(self, sentry_config):
        assert sentry_config.enabled is True

    def test_enabled_returns_false_without_dsn(self, disabled_sentry_config):
        assert disabled_sentry_config.enabled is False

    @patch.dict(
        "os.environ",
        {
            "N8N_SENTRY_DSN": "https://test@sentry.io/789",
            "N8N_VERSION": "2.0.0",
            "ENVIRONMENT": "production",
            "DEPLOYMENT_NAME": "prod-deployment",
        },
    )
    def test_from_env_creates_config_from_environment(self):
        config = SentryConfig.from_env()

        assert config.dsn == "https://test@sentry.io/789"
        assert config.n8n_version == "2.0.0"
        assert config.environment == "production"
        assert config.deployment_name == "prod-deployment"

    @patch.dict("os.environ", {}, clear=True)
    def test_from_env_uses_defaults_when_missing(self):
        config = SentryConfig.from_env()

        assert config.dsn == ""
        assert config.n8n_version == ""
        assert config.environment == ""
        assert config.deployment_name == ""
