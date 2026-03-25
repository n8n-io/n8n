/**
 * This is a generic Chroma error.
 */
export class ChromaError extends Error {
  constructor(name: string, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = name;
  }
}

/**
 * Indicates that there was a problem with the connection to the Chroma server (e.g. the server is down or the client is not connected to the internet)
 */
export class ChromaConnectionError extends Error {
  name = "ChromaConnectionError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

/** Indicates that the server encountered an error while handling the request. */
export class ChromaServerError extends Error {
  name = "ChromaServerError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

/** Indicate that there was an issue with the request that the client made. */
export class ChromaClientError extends Error {
  name = "ChromaClientError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

/** The request lacked valid authentication. */
export class ChromaUnauthorizedError extends Error {
  name = "ChromaAuthError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

/** The user does not have permission to access the requested resource. */
export class ChromaForbiddenError extends Error {
  name = "ChromaForbiddenError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class ChromaNotFoundError extends Error {
  name = "ChromaNotFoundError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class ChromaValueError extends Error {
  name = "ChromaValueError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class InvalidCollectionError extends Error {
  name = "InvalidCollectionError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class InvalidArgumentError extends Error {
  name = "InvalidArgumentError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class ChromaUniqueError extends Error {
  name = "ChromaUniqueError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class ChromaQuotaExceededError extends Error {
  name = "ChromaQuotaExceededError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class ChromaRateLimitError extends Error {
  name = "ChromaRateLimitError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export function createErrorByType(type: string, message: string) {
  switch (type) {
    case "InvalidCollection":
      return new InvalidCollectionError(message);
    case "InvalidArgumentError":
      return new InvalidArgumentError(message);
    default:
      return undefined;
  }
}
