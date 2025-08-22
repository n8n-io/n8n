# Messages
BROKER_INFO_REQUEST = "broker:inforequest"
BROKER_RUNNER_REGISTERED = "broker:runnerregistered"
BROKER_TASK_OFFER_ACCEPT = "broker:taskofferaccept"
BROKER_TASK_SETTINGS = "broker:tasksettings"
BROKER_TASK_CANCEL = "broker:taskcancel"
RUNNER_INFO = "runner:info"
RUNNER_TASK_OFFER = "runner:taskoffer"
RUNNER_TASK_ACCEPTED = "runner:taskaccepted"
RUNNER_TASK_REJECTED = "runner:taskrejected"
RUNNER_TASK_DONE = "runner:taskdone"
RUNNER_TASK_ERROR = "runner:taskerror"

# Runner
TASK_TYPE_PYTHON = "python"
RUNNER_NAME = "Python Task Runner"
DEFAULT_MAX_CONCURRENCY = 5  # tasks
DEFAULT_MAX_PAYLOAD_SIZE = 1024 * 1024 * 1024  # 1 GiB
DEFAULT_TASK_TIMEOUT = 60  # seconds
OFFER_INTERVAL = 0.25  # 250ms
OFFER_VALIDITY = 5000  # ms
OFFER_VALIDITY_MAX_JITTER = 500  # ms
OFFER_VALIDITY_LATENCY_BUFFER = 0.1  # 100ms

# Executor
EXECUTOR_USER_OUTPUT_KEY = "__n8n_internal_user_output__"

# Broker
DEFAULT_TASK_BROKER_URI = "http://127.0.0.1:5679"
TASK_BROKER_WS_PATH = "/runners/_ws"

# Env vars
ENV_TASK_BROKER_URI = "N8N_RUNNERS_TASK_BROKER_URI"
ENV_GRANT_TOKEN = "N8N_RUNNERS_GRANT_TOKEN"
ENV_MAX_CONCURRENCY = "N8N_RUNNERS_MAX_CONCURRENCY"
ENV_MAX_PAYLOAD_SIZE = "N8N_RUNNERS_MAX_PAYLOAD"
ENV_TASK_TIMEOUT = "N8N_RUNNERS_TASK_TIMEOUT"
ENV_HIDE_TASK_OFFER_LOGS = "N8N_RUNNERS_HIDE_TASK_OFFER_LOGS"

# Logging
LOG_FORMAT = "%(asctime)s.%(msecs)03d\t%(levelname)s\t%(message)s"
LOG_TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"

# Rejection reasons
TASK_REJECTED_REASON_OFFER_EXPIRED = (
    "Offer expired - not accepted within validity window"
)
TASK_REJECTED_REASON_AT_CAPACITY = "No open task slots - runner already at capacity"
