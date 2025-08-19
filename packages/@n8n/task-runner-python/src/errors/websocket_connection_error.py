class WebsocketConnectionError(ConnectionError):
    def __init__(self, broker_uri: str):
        super().__init__(
            f"Failed to connect to broker. Please check if broker is reachable at: {broker_uri}"
        )
