import { AISDKError } from '@ai-sdk/provider';

const name = 'AI_MissingToolResultsError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export class MissingToolResultsError extends AISDKError {
  private readonly [symbol] = true;

  readonly toolCallIds: string[];

  constructor({ toolCallIds }: { toolCallIds: string[] }) {
    super({
      name,
      message: `Tool result${
        toolCallIds.length > 1 ? 's are' : ' is'
      } missing for tool call${toolCallIds.length > 1 ? 's' : ''} ${toolCallIds.join(
        ', ',
      )}.`,
    });

    this.toolCallIds = toolCallIds;
  }

  static isInstance(error: unknown): error is MissingToolResultsError {
    return AISDKError.hasMarker(error, marker);
  }
}
