class WebsocketConnectionError(ConnectionError):
    def __init__(self):
        super().__init__("Websocket connection error")
