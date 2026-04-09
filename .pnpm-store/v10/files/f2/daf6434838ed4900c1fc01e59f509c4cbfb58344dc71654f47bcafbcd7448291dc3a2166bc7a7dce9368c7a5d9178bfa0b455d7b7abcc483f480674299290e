import { AISDKError } from '@ai-sdk/provider';

const name = 'AI_NoSuchToolError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export class NoSuchToolError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly toolName: string;
  readonly availableTools: string[] | undefined;

  constructor({
    toolName,
    availableTools = undefined,
    message = `Model tried to call unavailable tool '${toolName}'. ${
      availableTools === undefined
        ? 'No tools are available.'
        : `Available tools: ${availableTools.join(', ')}.`
    }`,
  }: {
    toolName: string;
    availableTools?: string[] | undefined;
    message?: string;
  }) {
    super({ name, message });

    this.toolName = toolName;
    this.availableTools = availableTools;
  }

  static isInstance(error: unknown): error is NoSuchToolError {
    return AISDKError.hasMarker(error, marker);
  }
}
