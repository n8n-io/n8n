import { AISDKError } from '@ai-sdk/provider';
import { UIMessage } from '../ui/ui-messages';

const name = 'AI_MessageConversionError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export class MessageConversionError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly originalMessage: Omit<UIMessage, 'id'>;

  constructor({
    originalMessage,
    message,
  }: {
    originalMessage: Omit<UIMessage, 'id'>;
    message: string;
  }) {
    super({ name, message });

    this.originalMessage = originalMessage;
  }

  static isInstance(error: unknown): error is MessageConversionError {
    return AISDKError.hasMarker(error, marker);
  }
}
