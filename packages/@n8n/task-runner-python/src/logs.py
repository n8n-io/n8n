import sys
import logging
import os
from src.constants import LOG_FORMAT, LOG_TIMESTAMP_FORMAT

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

        # When started by launcher, log level and timestamp are handled by launcher.
        self.short_form = not sys.stdout.isatty()

    def format(self, record):
        if self.short_form:
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


def setup_logging():
    logger = logging.getLogger()

    log_level_str = os.getenv("N8N_RUNNERS_LAUNCHER_LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)
    logger.setLevel(log_level)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(ColorFormatter(LOG_FORMAT, LOG_TIMESTAMP_FORMAT))
    logger.addHandler(stream_handler)

    # Hardcoded to INFO as websocket logs are too verbose
    logging.getLogger("websockets.client").setLevel(logging.INFO)
    logging.getLogger("websockets.server").setLevel(logging.INFO)
    logging.getLogger("websockets").setLevel(logging.INFO)
