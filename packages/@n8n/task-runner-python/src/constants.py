# Messages
BROKER_INFO_REQUEST = "broker:inforequest"
BROKER_RUNNER_REGISTERED = "broker:runnerregistered"
BROKER_TASK_OFFER_ACCEPT = "broker:taskofferaccept"
BROKER_TASK_SETTINGS = "broker:tasksettings"
BROKER_TASK_CANCEL = "broker:taskcancel"
BROKER_RPC_RESPONSE = "broker:rpcresponse"
RUNNER_INFO = "runner:info"
RUNNER_TASK_OFFER = "runner:taskoffer"
RUNNER_TASK_ACCEPTED = "runner:taskaccepted"
RUNNER_TASK_REJECTED = "runner:taskrejected"
RUNNER_TASK_DONE = "runner:taskdone"
RUNNER_TASK_ERROR = "runner:taskerror"
RUNNER_RPC_CALL = "runner:rpc"

# Runner
TASK_TYPE_PYTHON = "python"
RUNNER_NAME = "Python Task Runner"
DEFAULT_MAX_CONCURRENCY = 5  # tasks
DEFAULT_MAX_PAYLOAD_SIZE = 1024 * 1024 * 1024  # 1 GiB
DEFAULT_TASK_TIMEOUT = 60  # seconds
DEFAULT_AUTO_SHUTDOWN_TIMEOUT = 0  # seconds
DEFAULT_SHUTDOWN_TIMEOUT = 10  # seconds
OFFER_INTERVAL = 0.25  # 250ms
OFFER_VALIDITY = 5000  # ms
OFFER_VALIDITY_MAX_JITTER = 500  # ms
OFFER_VALIDITY_LATENCY_BUFFER = 0.1  # 100ms
MAX_VALIDATION_CACHE_SIZE = 500  # cached validation results

# Executor
EXECUTOR_USER_OUTPUT_KEY = "__n8n_internal_user_output__"
EXECUTOR_CIRCULAR_REFERENCE_KEY = "__n8n_internal_circular_ref__"
EXECUTOR_ALL_ITEMS_FILENAME = "<all_items_task_execution>"
EXECUTOR_PER_ITEM_FILENAME = "<per_item_task_execution>"
EXECUTOR_FILENAMES = {EXECUTOR_ALL_ITEMS_FILENAME, EXECUTOR_PER_ITEM_FILENAME}

# Broker
DEFAULT_TASK_BROKER_URI = "http://127.0.0.1:5679"
TASK_BROKER_WS_PATH = "/runners/_ws"

# Health check
DEFAULT_HEALTH_CHECK_SERVER_HOST = "127.0.0.1"
DEFAULT_HEALTH_CHECK_SERVER_PORT = 5681

# Env vars
ENV_TASK_BROKER_URI = "N8N_RUNNERS_TASK_BROKER_URI"
ENV_GRANT_TOKEN = "N8N_RUNNERS_GRANT_TOKEN"
ENV_MAX_CONCURRENCY = "N8N_RUNNERS_MAX_CONCURRENCY"
ENV_MAX_PAYLOAD_SIZE = "N8N_RUNNERS_MAX_PAYLOAD"
ENV_TASK_TIMEOUT = "N8N_RUNNERS_TASK_TIMEOUT"
ENV_AUTO_SHUTDOWN_TIMEOUT = "N8N_RUNNERS_AUTO_SHUTDOWN_TIMEOUT"
ENV_GRACEFUL_SHUTDOWN_TIMEOUT = "N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT"
ENV_STDLIB_ALLOW = "N8N_RUNNERS_STDLIB_ALLOW"
ENV_EXTERNAL_ALLOW = "N8N_RUNNERS_EXTERNAL_ALLOW"
ENV_BUILTINS_DENY = "N8N_RUNNERS_BUILTINS_DENY"
ENV_HEALTH_CHECK_SERVER_ENABLED = "N8N_RUNNERS_HEALTH_CHECK_SERVER_ENABLED"
ENV_HEALTH_CHECK_SERVER_HOST = "N8N_RUNNERS_HEALTH_CHECK_SERVER_HOST"
ENV_HEALTH_CHECK_SERVER_PORT = "N8N_RUNNERS_HEALTH_CHECK_SERVER_PORT"
ENV_SENTRY_DSN = "N8N_SENTRY_DSN"
ENV_N8N_VERSION = "N8N_VERSION"
ENV_ENVIRONMENT = "ENVIRONMENT"
ENV_DEPLOYMENT_NAME = "DEPLOYMENT_NAME"

# Sentry
SENTRY_TAG_SERVER_TYPE_KEY = "server_type"
SENTRY_TAG_SERVER_TYPE_VALUE = "task_runner_python"

# Logging
LOG_FORMAT = "%(asctime)s.%(msecs)03d\t%(levelname)s\t%(message)s"
LOG_TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"
LOG_TASK_COMPLETE = 'Completed task {task_id} in {duration} for node "{node_name}" ({node_id}) in workflow "{workflow_name}" ({workflow_id})'
LOG_TASK_CANCEL = 'Cancelled task {task_id} for node "{node_name}" ({node_id}) in workflow "{workflow_name}" ({workflow_id})'
LOG_TASK_CANCEL_UNKNOWN = (
    "Received cancel for unknown task: {task_id}. Discarding message."
)
LOG_TASK_CANCEL_WAITING = "Cancelled task {task_id} (waiting for settings)"
LOG_SENTRY_MISSING = "Sentry is enabled but sentry-sdk is not installed. Install with: uv sync --all-extras"

# RPC
RPC_BROWSER_CONSOLE_LOG_METHOD = "logNodeOutput"

# Rejection reasons
TASK_REJECTED_REASON_OFFER_EXPIRED = (
    "Offer expired - not accepted within validity window"
)
TASK_REJECTED_REASON_AT_CAPACITY = "No open task slots - runner already at capacity"

# Security
BUILTINS_DENY_DEFAULT = "eval,exec,compile,open,input,breakpoint,getattr,object,type,vars,setattr,delattr,hasattr,dir,memoryview,__build_class__"
ALWAYS_BLOCKED_ATTRIBUTES = {
    "__subclasses__",
    "__globals__",
    "__builtins__",
    "__traceback__",
    "tb_frame",
    "tb_next",
    "f_back",
    "f_globals",
    "f_locals",
    "f_code",
    "f_builtins",
    "__getattribute__",
    "__qualname__",
    "__module__",
    "gi_frame",
    "gi_code",
    "gi_yieldfrom",
    "cr_frame",
    "cr_code",
    "ag_frame",
    "ag_code",
    "__thisclass__",
    "__self_class__",
}
# Attributes blocked only in certain contexts:
# - In attribute chains (e.g., x.__class__.__bases__)
# - On literals (e.g., "".__class__)
CONDITIONALLY_BLOCKED_ATTRIBUTES = {
    "__class__",
    "__bases__",
    "__code__",
    "__closure__",
    "__loader__",
    "__cached__",
    "__dict__",
    "__import__",
    "__mro__",
    "__init_subclass__",
    "__getattr__",
    "__setattr__",
    "__delattr__",
    "__self__",
    "__func__",
    "__wrapped__",
    "__annotations__",
}
UNSAFE_ATTRIBUTES = ALWAYS_BLOCKED_ATTRIBUTES | CONDITIONALLY_BLOCKED_ATTRIBUTES

# errors
ERROR_RELATIVE_IMPORT = "Relative imports are disallowed."
ERROR_STDLIB_DISALLOWED = "Import of standard library module '{module}' is disallowed. Allowed stdlib modules: {allowed}"
ERROR_EXTERNAL_DISALLOWED = "Import of external package '{module}' is disallowed. Allowed external packages: {allowed}"
ERROR_DANGEROUS_ATTRIBUTE = "Access to attribute '{attr}' is disallowed, because it can be used to bypass security restrictions."
ERROR_DYNAMIC_IMPORT = (
    "Dynamic __import__() calls are not allowed for security reasons."
)
