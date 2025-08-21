class WebsocketConnectionError(ConnectionError):
    """Raised when the task runner fails to establish a WebSocket connection to the broker.

    Common causes include network issues, incorrect broker URI, or the broker service being unavailable.
    """

    def __init__(self, broker_uri: str):
        super().__init__(
            f"Failed to connect to broker. Please check if broker is reachable at: {broker_uri}"
        )
