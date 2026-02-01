class SecurityViolationError(Exception):
    """Raised when code violates security policies, typically through the use of disallowed modules or builtins."""

    def __init__(
        self, message: str = "Security violations detected", description: str = ""
    ):
        super().__init__(message)
        self.message = message
        self.description = description
