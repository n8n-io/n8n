import { AISDKError, getErrorMessage } from '@ai-sdk/provider';
import { InvalidToolInputError } from './invalid-tool-input-error';
import { NoSuchToolError } from './no-such-tool-error';

const name = 'AI_ToolCallRepairError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export class ToolCallRepairError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly originalError: NoSuchToolError | InvalidToolInputError;

  constructor({
    cause,
    originalError,
    message = `Error repairing tool call: ${getErrorMessage(cause)}`,
  }: {
    message?: string;
    cause: unknown;
    originalError: NoSuchToolError | InvalidToolInputError;
  }) {
    super({ name, message, cause });
    this.originalError = originalError;
  }

  static isInstance(error: unknown): error is ToolCallRepairError {
    return AISDKError.hasMarker(error, marker);
  }
}
