import logging
from typing import Any

from src.config.sentry_config import SentryConfig
from src.constants import (
    EXECUTOR_FILENAMES,
    IGNORED_ERROR_TYPES,
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

        integrations = [LoggingIntegration(level=logging.ERROR)]

        is_profiling_enabled = self.config.profiles_sample_rate > 0

        if is_profiling_enabled:
            try:
                # Import profiling integration lazily to avoid hard dependency
                import sentry_sdk.profiler  # noqa: F401

                self.logger.info("Sentry profiling integration loaded")
            except ImportError:
                self.logger.warning(
                    "Sentry profiling is enabled but sentry-sdk profiling is not available. "
                    "Install with: uv sync --all-extras"
                )

        is_tracing_enabled = self.config.traces_sample_rate > 0
        if is_profiling_enabled and not is_tracing_enabled:
            self.logger.warning(
                "Profiling is enabled but tracing is disabled. Profiling will not work."
            )

        init_options = {
            "dsn": self.config.dsn,
            "release": f"n8n@{self.config.n8n_version}",
            "environment": self.config.environment,
            "server_name": self.config.deployment_name,
            "before_send": self._filter_out_ignored_errors,
            "attach_stacktrace": True,
            "send_default_pii": False,
            "auto_enabling_integrations": False,
            "default_integrations": True,
            "integrations": integrations,
        }

        if self.config.traces_sample_rate > 0:
            init_options["traces_sample_rate"] = self.config.traces_sample_rate

        if is_profiling_enabled:
            init_options["profiles_sample_rate"] = self.config.profiles_sample_rate

        sentry_sdk.init(**init_options)
        sentry_sdk.set_tag(SENTRY_TAG_SERVER_TYPE_KEY, SENTRY_TAG_SERVER_TYPE_VALUE)
        self.logger.info("Sentry ready")

    def shutdown(self) -> None:
        import sentry_sdk

        sentry_sdk.flush(timeout=2.0)
        self.logger.info("Sentry stopped")

    def _filter_out_ignored_errors(self, event: Any, hint: Any) -> Any | None:
        if "exc_info" in hint:
            exc_type, _, _ = hint["exc_info"]
            for ignored_type in IGNORED_ERROR_TYPES:
                if (
                    isinstance(exc_type, type)
                    and isinstance(ignored_type, type)
                    and issubclass(exc_type, ignored_type)
                ):
                    return None

        for exception in event.get("exception", {}).get("values", []):
            if self._is_from_user_code(exception):
                return None

            exc_type_name = exception.get("type", "")
            for ignored_type in IGNORED_ERROR_TYPES:
                if ignored_type.__name__ == exc_type_name:
                    return None

        return event

    def _is_from_user_code(self, exception: dict[str, Any]):
        for frame in exception.get("stacktrace", {}).get("frames", []):
            if frame.get("filename", "") in EXECUTOR_FILENAMES:
                return True
        return False


def setup_sentry(sentry_config: SentryConfig) -> TaskRunnerSentry | None:
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
