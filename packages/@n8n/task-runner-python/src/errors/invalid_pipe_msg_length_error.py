class InvalidPipeMsgLengthError(Exception):
    def __init__(self, length: int):
        super().__init__(f"Invalid pipe message length: {length} bytes")
