class InvalidPipeMsgContentError(Exception):
    def __init__(self, message: str):
        super().__init__(f"Invalid pipe message content: {message}")
