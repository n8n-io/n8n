import { isContentMedia, stripInlineMediaFromSingleMessage } from './mediaStripping.js';

/**
 * Default maximum size in bytes for GenAI messages.
 * Messages exceeding this limit will be truncated.
 */
const DEFAULT_GEN_AI_MESSAGES_BYTE_LIMIT = 20000;

/**
 * Message format used by OpenAI and Anthropic APIs.
 */

/**
 * Calculate the UTF-8 byte length of a string.
 */
const utf8Bytes = (text) => {
  return new TextEncoder().encode(text).length;
};

/**
 * Calculate the UTF-8 byte length of a value's JSON representation.
 */
const jsonBytes = (value) => {
  return utf8Bytes(JSON.stringify(value));
};

/**
 * Truncate a string to fit within maxBytes (inclusive) when encoded as UTF-8.
 * Uses binary search for efficiency with multi-byte characters.
 *
 * @param text - The string to truncate
 * @param maxBytes - Maximum byte length (inclusive, UTF-8 encoded)
 * @returns Truncated string whose UTF-8 byte length is at most maxBytes
 */
function truncateTextByBytes(text, maxBytes) {
  if (utf8Bytes(text) <= maxBytes) {
    return text;
  }

  let low = 0;
  let high = text.length;
  let bestFit = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid);
    const byteSize = utf8Bytes(candidate);

    if (byteSize <= maxBytes) {
      bestFit = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return bestFit;
}

/**
 * Extract text content from a message item.
 * Handles plain strings and objects with a text property.
 *
 * @returns The text content
 */
function getItemText(item) {
  if (typeof item === 'string') {
    return item;
  }
  if ('text' in item && typeof item.text === 'string') {
    return item.text;
  }
  return '';
}

/**
 * Create a new item with updated text content while preserving the original structure.
 *
 * @param item - Original item (string or object)
 * @param text - New text content
 * @returns New item with updated text
 */
function withItemText(item, text) {
  if (typeof item === 'string') {
    return text;
  }
  return { ...item, text };
}

/**
 * Check if a message has the OpenAI/Anthropic content format.
 */
function isContentMessage(message) {
  return (
    message !== null &&
    typeof message === 'object' &&
    'content' in message &&
    typeof (message ).content === 'string'
  );
}

/**
 * Check if a message has the OpenAI/Anthropic content array format.
 */
function isContentArrayMessage(message) {
  return message !== null && typeof message === 'object' && 'content' in message && Array.isArray(message.content);
}

/**
 * Check if a message has the Google GenAI parts format.
 */
function isPartsMessage(message) {
  return (
    message !== null &&
    typeof message === 'object' &&
    'parts' in message &&
    Array.isArray((message ).parts) &&
    (message ).parts.length > 0
  );
}

/**
 * Truncate a message with `content: string` format (OpenAI/Anthropic).
 *
 * @param message - Message with content property
 * @param maxBytes - Maximum byte limit
 * @returns Array with truncated message, or empty array if it doesn't fit
 */
function truncateContentMessage(message, maxBytes) {
  // Calculate overhead (message structure without content)
  const emptyMessage = { ...message, content: '' };
  const overhead = jsonBytes(emptyMessage);
  const availableForContent = maxBytes - overhead;

  if (availableForContent <= 0) {
    return [];
  }

  const truncatedContent = truncateTextByBytes(message.content, availableForContent);
  return [{ ...message, content: truncatedContent }];
}

/**
 * Extracts the array items and their key from an array-based message.
 * Returns `null` key if neither `parts` nor `content` is a valid array.
 */
function getArrayItems(message)

 {
  if ('parts' in message && Array.isArray(message.parts)) {
    return { key: 'parts', items: message.parts };
  }
  if ('content' in message && Array.isArray(message.content)) {
    return { key: 'content', items: message.content };
  }
  return { key: null, items: [] };
}

/**
 * Truncate a message with an array-based format.
 * Handles both `parts: [...]` (Google GenAI) and `content: [...]` (OpenAI/Anthropic multimodal).
 * Keeps as many complete items as possible, only truncating the first item if needed.
 *
 * @param message - Message with parts or content array
 * @param maxBytes - Maximum byte limit
 * @returns Array with truncated message, or empty array if it doesn't fit
 */
function truncateArrayMessage(message, maxBytes) {
  const { key, items } = getArrayItems(message);

  if (key === null || items.length === 0) {
    return [];
  }

  // Calculate overhead by creating empty text items
  const emptyItems = items.map(item => withItemText(item, ''));
  const overhead = jsonBytes({ ...message, [key]: emptyItems });
  let remainingBytes = maxBytes - overhead;

  if (remainingBytes <= 0) {
    return [];
  }

  // Include items until we run out of space
  const includedItems = [];

  for (const item of items) {
    const text = getItemText(item);
    const textSize = utf8Bytes(text);

    if (textSize <= remainingBytes) {
      // Item fits: include it as-is
      includedItems.push(item);
      remainingBytes -= textSize;
    } else if (includedItems.length === 0) {
      // First item doesn't fit: truncate it
      const truncated = truncateTextByBytes(text, remainingBytes);
      if (truncated) {
        includedItems.push(withItemText(item, truncated));
      }
      break;
    } else {
      // Subsequent item doesn't fit: stop here
      break;
    }
  }

  /* c8 ignore start
   * for type safety only, algorithm guarantees SOME text included */
  if (includedItems.length <= 0) {
    return [];
  } else {
    /* c8 ignore stop */
    return [{ ...message, [key]: includedItems }];
  }
}

/**
 * Truncate a single message to fit within maxBytes.
 *
 * Supports three message formats:
 * - OpenAI/Anthropic: `{ ..., content: string }`
 * - Vercel AI/OpenAI multimodal: `{ ..., content: Array<{type, text?, ...}> }`
 * - Google GenAI: `{ ..., parts: Array<string | {text: string} | non-text> }`
 *
 * @param message - The message to truncate
 * @param maxBytes - Maximum byte limit for the message
 * @returns Array containing the truncated message, or empty array if truncation fails
 */
function truncateSingleMessage(message, maxBytes) {
  if (!message) return [];

  // Handle plain strings (e.g., embeddings input)
  if (typeof message === 'string') {
    const truncated = truncateTextByBytes(message, maxBytes);
    return truncated ? [truncated] : [];
  }

  if (typeof message !== 'object') {
    return [];
  }

  if (isContentMessage(message)) {
    return truncateContentMessage(message, maxBytes);
  }

  if (isContentArrayMessage(message) || isPartsMessage(message)) {
    return truncateArrayMessage(message, maxBytes);
  }

  // Unknown message format: cannot truncate safely
  return [];
}

/**
 * Strip the inline media from message arrays.
 *
 * This returns a stripped message. We do NOT want to mutate the data in place,
 * because of course we still want the actual API/client to handle the media.
 */
function stripInlineMediaFromMessages(messages) {
  const stripped = messages.map(message => {
    let newMessage = undefined;
    if (!!message && typeof message === 'object') {
      if (isContentArrayMessage(message)) {
        newMessage = {
          ...message,
          content: stripInlineMediaFromMessages(message.content),
        };
      } else if ('content' in message && isContentMedia(message.content)) {
        newMessage = {
          ...message,
          content: stripInlineMediaFromSingleMessage(message.content),
        };
      }
      if (isPartsMessage(message)) {
        newMessage = {
          // might have to strip content AND parts
          ...(newMessage ?? message),
          parts: stripInlineMediaFromMessages(message.parts),
        };
      }
      if (isContentMedia(newMessage)) {
        newMessage = stripInlineMediaFromSingleMessage(newMessage);
      } else if (isContentMedia(message)) {
        newMessage = stripInlineMediaFromSingleMessage(message);
      }
    }
    return newMessage ?? message;
  });
  return stripped;
}

/**
 * Truncate an array of messages to fit within a byte limit.
 *
 * Strategy:
 * - Always keeps only the last (newest) message
 * - Strips inline media from the message
 * - Truncates the message content if it exceeds the byte limit
 *
 * @param messages - Array of messages to truncate
 * @param maxBytes - Maximum total byte limit for the message
 * @returns Array containing only the last message (possibly truncated)
 *
 * @example
 * ```ts
 * const messages = [msg1, msg2, msg3, msg4]; // newest is msg4
 * const truncated = truncateMessagesByBytes(messages, 10000);
 * // Returns [msg4] (truncated if needed)
 * ```
 */
function truncateMessagesByBytes(messages, maxBytes) {
  // Early return for empty or invalid input
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }

  // The result is always a single-element array that callers wrap with
  // JSON.stringify([message]), so subtract the 2-byte array wrapper ("["  and "]")
  // to ensure the final serialized value stays under the limit.
  const effectiveMaxBytes = maxBytes - 2;

  // Always keep only the last message
  const lastMessage = messages[messages.length - 1];

  // Strip inline media from the single message
  const stripped = stripInlineMediaFromMessages([lastMessage]);
  const strippedMessage = stripped[0];

  // Check if it fits
  const messageBytes = jsonBytes(strippedMessage);
  if (messageBytes <= effectiveMaxBytes) {
    return stripped;
  }

  // Truncate the single message if needed
  return truncateSingleMessage(strippedMessage, effectiveMaxBytes);
}

/**
 * Truncate GenAI messages using the default byte limit.
 *
 * Convenience wrapper around `truncateMessagesByBytes` with the default limit.
 *
 * @param messages - Array of messages to truncate
 * @returns Truncated array of messages
 */
function truncateGenAiMessages(messages) {
  return truncateMessagesByBytes(messages, DEFAULT_GEN_AI_MESSAGES_BYTE_LIMIT);
}

/**
 * Truncate GenAI string input using the default byte limit.
 *
 * @param input - The string to truncate
 * @returns Truncated string
 */
function truncateGenAiStringInput(input) {
  return truncateTextByBytes(input, DEFAULT_GEN_AI_MESSAGES_BYTE_LIMIT);
}

export { DEFAULT_GEN_AI_MESSAGES_BYTE_LIMIT, truncateGenAiMessages, truncateGenAiStringInput };
//# sourceMappingURL=messageTruncation.js.map
