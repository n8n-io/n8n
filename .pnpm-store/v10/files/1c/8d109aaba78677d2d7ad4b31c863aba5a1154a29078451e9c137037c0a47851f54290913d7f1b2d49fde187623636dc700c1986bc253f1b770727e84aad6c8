import { AISDKError, getErrorMessage } from '@ai-sdk/provider';

const name = 'AI_InvalidToolInputError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export class InvalidToolInputError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly toolName: string;
  readonly toolInput: string;

  constructor({
    toolInput,
    toolName,
    cause,
    message = `Invalid input for tool ${toolName}: ${getErrorMessage(cause)}`,
  }: {
    message?: string;
    toolInput: string;
    toolName: string;
    cause: unknown;
  }) {
    super({ name, message, cause });

    this.toolInput = toolInput;
    this.toolName = toolName;
  }

  static isInstance(error: unknown): error is InvalidToolInputError {
    return AISDKError.hasMarker(error, marker);
  }
}
