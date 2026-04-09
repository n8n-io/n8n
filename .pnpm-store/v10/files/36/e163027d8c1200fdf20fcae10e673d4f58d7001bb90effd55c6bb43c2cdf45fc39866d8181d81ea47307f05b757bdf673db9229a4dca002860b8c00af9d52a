import { AISDKError } from '@ai-sdk/provider';

const name = 'AI_UIMessageStreamError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

/**
 * Error thrown when a UI message stream contains invalid or out-of-sequence chunks.
 *
 * This typically occurs when:
 * - A delta chunk is received without a corresponding start chunk
 * - An end chunk is received without a corresponding start chunk
 * - A tool invocation is not found for the given toolCallId
 *
 * @see https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-ui-message-stream-error
 */
export class UIMessageStreamError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  /**
   * The type of chunk that caused the error (e.g., 'text-delta', 'reasoning-end').
   */
  readonly chunkType: string;

  /**
   * The ID associated with the failing chunk (part ID or toolCallId).
   */
  readonly chunkId: string;

  constructor({
    chunkType,
    chunkId,
    message,
  }: {
    chunkType: string;
    chunkId: string;
    message: string;
  }) {
    super({ name, message });

    this.chunkType = chunkType;
    this.chunkId = chunkId;
  }

  static isInstance(error: unknown): error is UIMessageStreamError {
    return AISDKError.hasMarker(error, marker);
  }
}
