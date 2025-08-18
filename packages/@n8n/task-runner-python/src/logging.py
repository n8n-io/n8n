import logging
import os
from .constants import LOG_FORMAT, LOG_DATE_FORMAT, ENV_HIDE_TASK_OFFER_LOGS


class ColoredFormatter(logging.Formatter):
    COLORS = {
        "DEBUG": "\033[34m",  # blue
        "INFO": "\033[32m",  # green
        "WARNING": "\033[33m",  # yellow
        "ERROR": "\033[31m",  # red
        "CRITICAL": "\033[31m",  # red
    }
    RESET = "\033[0m"

    def format(self, record):
        formatted = super().format(record)

        parts = formatted.split("\t")

        if len(parts) >= 3:
            timestamp = parts[0]
            level = parts[1]
            message = "\t".join(parts[2:])

            level_color = self.COLORS.get(record.levelname, "")
            if level_color:
                level = level_color + level + self.RESET
                message = level_color + message + self.RESET

            formatted = f"{timestamp}  {level}  {message}"

        return formatted


class TaskOfferFilter(logging.Filter):
    def __init__(self, hide_offers=False):
        super().__init__()
        self.hide_offers = hide_offers

    def filter(self, record):
        if not self.hide_offers:
            return True

        if (
            record.levelname == "DEBUG"
            and "websockets" in record.name
            and '"runner:taskoffer"' in record.getMessage()
        ):
            return False
        return True


def setup_logging():
    root_logger = logging.getLogger()

    handler = logging.StreamHandler()
    formatter = ColoredFormatter(LOG_FORMAT, LOG_DATE_FORMAT)
    handler.setFormatter(formatter)
    hide_offers = os.getenv(ENV_HIDE_TASK_OFFER_LOGS, "").lower() == "true"
    handler.addFilter(TaskOfferFilter(hide_offers))

    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    websockets_logger = logging.getLogger("websockets.client")
    websockets_logger.setLevel(logging.DEBUG)
