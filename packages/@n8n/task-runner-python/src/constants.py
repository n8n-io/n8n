# Message Types
BROKER_INFO_REQUEST = "broker:inforequest"
BROKER_RUNNER_REGISTERED = "broker:runnerregistered"
BROKER_TASK_OFFER_ACCEPT = "broker:taskofferaccept"

RUNNER_INFO = "runner:info"
RUNNER_TASK_OFFER = "runner:taskoffer"
RUNNER_TASK_ACCEPTED = "runner:taskaccepted"
RUNNER_TASK_REJECTED = "runner:taskrejected"

# Task Runner Defaults
TASK_TYPE_PYTHON = "python"
DEFAULT_MAX_CONCURRENCY = 5
DEFAULT_MAX_PAYLOAD_SIZE = 1024 * 1024 * 1024  # 1 GiB
OFFER_INTERVAL = 0.25  # 250ms
OFFER_VALIDITY = 5000  # ms
OFFER_VALIDITY_MAX_JITTER = 500  # ms
OFFER_VALIDITY_LATENCY_BUFFER = 0.1  # 100ms
DEFAULT_TASK_BROKER_URI = "http://127.0.0.1:5679"

# Environment Variables
ENV_TASK_BROKER_URI = "N8N_RUNNERS_TASK_BROKER_URI"
ENV_GRANT_TOKEN = "N8N_RUNNERS_GRANT_TOKEN"

# WebSocket Paths
WS_RUNNERS_PATH = "/runners/_ws"
