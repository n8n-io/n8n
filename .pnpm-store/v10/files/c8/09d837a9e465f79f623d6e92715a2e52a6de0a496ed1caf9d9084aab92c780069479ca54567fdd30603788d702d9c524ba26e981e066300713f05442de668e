const marker = 'vercel.ai.gateway.error';
const symbol = Symbol.for(marker);

export abstract class GatewayError extends Error {
  private readonly [symbol] = true; // used in isInstance

  abstract readonly name: string;
  abstract readonly type: string;
  readonly statusCode: number;
  readonly cause?: unknown;
  readonly generationId?: string;

  constructor({
    message,
    statusCode = 500,
    cause,
    generationId,
  }: {
    message: string;
    statusCode?: number;
    cause?: unknown;
    generationId?: string;
  }) {
    super(generationId ? `${message} [${generationId}]` : message);
    this.statusCode = statusCode;
    this.cause = cause;
    this.generationId = generationId;
  }

  /**
   * Checks if the given error is a Gateway Error.
   * @param {unknown} error - The error to check.
   * @returns {boolean} True if the error is a Gateway Error, false otherwise.
   */
  static isInstance(error: unknown): error is GatewayError {
    return GatewayError.hasMarker(error);
  }

  static hasMarker(error: unknown): error is GatewayError {
    return (
      typeof error === 'object' &&
      error !== null &&
      symbol in error &&
      (error as any)[symbol] === true
    );
  }
}
