"""Constants for integration tests."""

# Network configuration
BROKER_PORT = 8080
BROKER_URL = f"http://localhost:{BROKER_PORT}"

# WebSocket configuration
WS_PATH = "/runners/_ws"

# Task runner configuration
GRANT_TOKEN = "test-token"
MAX_CONCURRENCY = 5
LOG_LEVEL = "DEBUG"

# Timing configuration
CONNECTION_WAIT = 0.5  # Time to wait for connection establishment
DEFAULT_TIMEOUT = 5.0  # Default timeout for waiting on messages
GRACEFUL_SHUTDOWN_TIMEOUT = 2.0  # Timeout for graceful shutdown
TASK_TIMEOUT = 3  # Task execution timeout in seconds (short for testing)

# Test data defaults
DEFAULT_WORKFLOW_NAME = "Test Workflow"
DEFAULT_NODE_NAME = "Test Node"

# Environment variable names
ENV_GRANT_TOKEN = "N8N_RUNNERS_GRANT_TOKEN"
ENV_BROKER_URI = "N8N_RUNNERS_TASK_BROKER_URI"
ENV_HEALTH_CHECK = "N8N_RUNNER_HEALTH_CHECK_SERVER_ENABLED"
ENV_MAX_CONCURRENCY = "N8N_RUNNERS_MAX_CONCURRENCY"
ENV_LOG_LEVEL = "N8N_RUNNER_LOG_LEVEL"
ENV_TASK_TIMEOUT = "N8N_RUNNERS_TASK_TIMEOUT"
