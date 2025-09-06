import logging
from typing import Any, Optional

from src.errors.task_runtime_error import TaskRuntimeError
from src.config.sentry_config import SentryConfig
from src.constants import (
    EXECUTOR_FILENAMES,
    LOG_SENTRY_MISSING,
    SENTRY_TAG_SERVER_TYPE_KEY,
    SENTRY_TAG_SERVER_TYPE_VALUE,
)


class TaskRunnerSentry:
    def __init__(self, config: SentryConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)

    def init(self) -> None:
        import sentry_sdk
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_sdk.init(
            dsn=self.config.dsn,
            release=f"n8n@{self.config.n8n_version}",
            environment=self.config.environment,
            server_name=self.config.deployment_name,
            before_send=self._filter_out_ignored_errors,
            attach_stacktrace=True,
            send_default_pii=False,
            auto_enabling_integrations=False,
            default_integrations=True,
            integrations=[LoggingIntegration(level=logging.ERROR)],
        )
        sentry_sdk.set_tag(SENTRY_TAG_SERVER_TYPE_KEY, SENTRY_TAG_SERVER_TYPE_VALUE)
        self.logger.info("Sentry ready")

    def shutdown(self) -> None:
        import sentry_sdk

        sentry_sdk.flush(timeout=2.0)
        self.logger.info("Sentry stopped")

    def _filter_out_ignored_errors(self, event: Any, hint: Any) -> Optional[Any]:
        if "exc_info" in hint:
            exc_type, _, _ = hint["exc_info"]
            if exc_type is TaskRuntimeError:
                return None

        for exception in event.get("exception", {}).get("values", []):
            if self._is_from_user_code(exception):
                return None

        return event

    def _is_from_user_code(self, exception: dict[str, Any]):
        for frame in exception.get("stacktrace", {}).get("frames", []):
            if frame.get("filename", "") in EXECUTOR_FILENAMES:
                return True
        return False


def setup_sentry(sentry_config: SentryConfig) -> Optional[TaskRunnerSentry]:
    if not sentry_config.enabled:
        return None

    try:
        sentry = TaskRunnerSentry(sentry_config)
        sentry.init()
        return sentry
    except ImportError:
        logger = logging.getLogger(__name__)
        logger.warning(LOG_SENTRY_MISSING)
        return None
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to initialize Sentry: {e}")
        return None
