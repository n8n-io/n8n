import { IdGenerator } from '@ai-sdk/provider-utils';
import { UIMessage } from '../ui/ui-messages';

/**
 * Determines the message ID to use for a response message.
 * If the last message is an assistant message, its ID is reused (continuation).
 * Otherwise, a new ID is generated or the provided ID is used.
 *
 * @param options.originalMessages - The original messages. If not provided, returns `undefined`
 *   since client-side ID generation is used in non-persistence mode.
 * @param options.responseMessageId - The response message ID or an ID generator function.
 *
 * @returns The message ID to use, or `undefined` if no persistence mode.
 */
export function getResponseUIMessageId({
  originalMessages,
  responseMessageId,
}: {
  originalMessages: UIMessage[] | undefined;
  responseMessageId: string | IdGenerator;
}) {
  // when there are no original messages (i.e. no persistence),
  // the assistant message id generation is handled on the client side.
  if (originalMessages == null) {
    return undefined;
  }

  const lastMessage = originalMessages[originalMessages.length - 1];

  return lastMessage?.role === 'assistant'
    ? lastMessage.id
    : typeof responseMessageId === 'function'
      ? responseMessageId()
      : responseMessageId;
}
