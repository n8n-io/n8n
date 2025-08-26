import sys
import logging
import os
from src.constants import LOG_FORMAT, LOG_TIMESTAMP_FORMAT, ENV_HIDE_TASK_OFFER_LOGS

COLORS = {
    "DEBUG": "\033[34m",  # blue
    "INFO": "\033[32m",  # green
    "WARNING": "\033[33m",  # yellow
    "ERROR": "\033[31m",  # red
    "CRITICAL": "\033[31m",  # red
}

RESET = "\033[0m"


class ColorFormatter(logging.Formatter):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.use_colors = os.getenv("NO_COLOR") is None

    def format(self, record):
        if os.getenv("N8N_RUNNERS_HEALTH_CHECK_SERVER_ENABLED") == "true":
            return record.getMessage()
        formatted = super().format(record)

        if not self.use_colors:
            return formatted

        parts = formatted.split("\t")

        if len(parts) >= 3:
            timestamp = parts[0]
            level = parts[1]
            message = " ".join(parts[2:])

            level_color = COLORS.get(record.levelname, "")
            if level_color:
                level = level_color + level + RESET
                message = level_color + message + RESET

            formatted = f"{timestamp}  {level}  {message}"

        return formatted


class TaskOfferFilter(logging.Filter):
    def __init__(self):
        super().__init__()
        self.hide_offers = os.getenv(ENV_HIDE_TASK_OFFER_LOGS, "").lower() == "true"

    def filter(self, record):
        """Filter out task offers if N8N_RUNNERS_HIDE_TASK_OFFER_LOGS is 'true'."""

        return not (self.hide_offers and self._is_task_offer_message(record))

    def _is_task_offer_message(self, record):
        return (
            record.levelname == "DEBUG"
            and "websockets" in record.name
            and '"runner:taskoffer"' in record.getMessage()
        )


def setup_logging():
    logger = logging.getLogger()

    log_level_str = os.getenv("N8N_RUNNERS_LAUNCHER_LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)
    logger.setLevel(log_level)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(ColorFormatter(LOG_FORMAT, LOG_TIMESTAMP_FORMAT))
    stream_handler.addFilter(TaskOfferFilter())
    logger.addHandler(stream_handler)

    # Harcode to INFO as websocket logs are too verbose
    logging.getLogger("websockets.client").setLevel(logging.INFO)
    logging.getLogger("websockets.server").setLevel(logging.INFO)
    logging.getLogger("websockets").setLevel(logging.INFO)
