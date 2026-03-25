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
 * Truncate a string to fit within maxBytes when encoded as UTF-8.
 * Uses binary search for efficiency with multi-byte characters.
 *
 * @param text - The string to truncate
 * @param maxBytes - Maximum byte length (UTF-8 encoded)
 * @returns Truncated string that fits within maxBytes
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
 * Extract text content from a Google GenAI message part.
 * Parts are either plain strings or objects with a text property.
 *
 * @returns The text content
 */
function getPartText(part) {
  if (typeof part === 'string') {
    return part;
  }
  if ('text' in part) return part.text;
  return '';
}

/**
 * Create a new part with updated text content while preserving the original structure.
 *
 * @param part - Original part (string or object)
 * @param text - New text content
 * @returns New part with updated text
 */
function withPartText(part, text) {
  if (typeof part === 'string') {
    return text;
  }
  return { ...part, text };
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
 * Check if a content part is an OpenAI/Anthropic media source
 */
function isContentMedia(part) {
  if (!part || typeof part !== 'object') return false;

  return (
    isContentMediaSource(part) ||
    hasInlineData(part) ||
    ('media_type' in part && typeof part.media_type === 'string' && 'data' in part) ||
    ('image_url' in part && typeof part.image_url === 'string' && part.image_url.startsWith('data:')) ||
    ('type' in part && (part.type === 'blob' || part.type === 'base64')) ||
    'b64_json' in part ||
    ('type' in part && 'result' in part && part.type === 'image_generation') ||
    ('uri' in part && typeof part.uri === 'string' && part.uri.startsWith('data:'))
  );
}
function isContentMediaSource(part) {
  return 'type' in part && typeof part.type === 'string' && 'source' in part && isContentMedia(part.source);
}
function hasInlineData(part) {
  return (
    'inlineData' in part &&
    !!part.inlineData &&
    typeof part.inlineData === 'object' &&
    'data' in part.inlineData &&
    typeof part.inlineData.data === 'string'
  );
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
 * Truncate a message with `parts: [...]` format (Google GenAI).
 * Keeps as many complete parts as possible, only truncating the first part if needed.
 *
 * @param message - Message with parts array
 * @param maxBytes - Maximum byte limit
 * @returns Array with truncated message, or empty array if it doesn't fit
 */
function truncatePartsMessage(message, maxBytes) {
  const { parts } = message;

  // Calculate overhead by creating empty text parts
  const emptyParts = parts.map(part => withPartText(part, ''));
  const overhead = jsonBytes({ ...message, parts: emptyParts });
  let remainingBytes = maxBytes - overhead;

  if (remainingBytes <= 0) {
    return [];
  }

  // Include parts until we run out of space
  const includedParts = [];

  for (const part of parts) {
    const text = getPartText(part);
    const textSize = utf8Bytes(text);

    if (textSize <= remainingBytes) {
      // Part fits: include it as-is
      includedParts.push(part);
      remainingBytes -= textSize;
    } else if (includedParts.length === 0) {
      // First part doesn't fit: truncate it
      const truncated = truncateTextByBytes(text, remainingBytes);
      if (truncated) {
        includedParts.push(withPartText(part, truncated));
      }
      break;
    } else {
      // Subsequent part doesn't fit: stop here
      break;
    }
  }

  /* c8 ignore start
   * for type safety only, algorithm guarantees SOME text included */
  if (includedParts.length <= 0) {
    return [];
  } else {
    /* c8 ignore stop */
    return [{ ...message, parts: includedParts }];
  }
}

/**
 * Truncate a single message to fit within maxBytes.
 *
 * Supports two message formats:
 * - OpenAI/Anthropic: `{ ..., content: string }`
 * - Google GenAI: `{ ..., parts: Array<string | {text: string} | non-text> }`
 *
 * @param message - The message to truncate
 * @param maxBytes - Maximum byte limit for the message
 * @returns Array containing the truncated message, or empty array if truncation fails
 */
function truncateSingleMessage(message, maxBytes) {
  /* c8 ignore start - unreachable */
  if (!message || typeof message !== 'object') {
    return [];
  }
  /* c8 ignore stop */

  if (isContentMessage(message)) {
    return truncateContentMessage(message, maxBytes);
  }

  if (isPartsMessage(message)) {
    return truncatePartsMessage(message, maxBytes);
  }

  // Unknown message format: cannot truncate safely
  return [];
}

const REMOVED_STRING = '[Filtered]';

const MEDIA_FIELDS = ['image_url', 'data', 'content', 'b64_json', 'result', 'uri'] ;

function stripInlineMediaFromSingleMessage(part) {
  const strip = { ...part };
  if (isContentMedia(strip.source)) {
    strip.source = stripInlineMediaFromSingleMessage(strip.source);
  }
  // google genai inline data blob objects
  if (hasInlineData(part)) {
    strip.inlineData = { ...part.inlineData, data: REMOVED_STRING };
  }
  for (const field of MEDIA_FIELDS) {
    if (typeof strip[field] === 'string') strip[field] = REMOVED_STRING;
  }
  return strip;
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
 * - Keeps the newest messages (from the end of the array)
 * - Uses O(n) algorithm: precompute sizes once, then find largest suffix under budget
 * - If no complete messages fit, attempts to truncate the newest single message
 *
 * @param messages - Array of messages to truncate
 * @param maxBytes - Maximum total byte limit for all messages
 * @returns Truncated array of messages
 *
 * @example
 * ```ts
 * const messages = [msg1, msg2, msg3, msg4]; // newest is msg4
 * const truncated = truncateMessagesByBytes(messages, 10000);
 * // Returns [msg3, msg4] if they fit, or [msg4] if only it fits, etc.
 * ```
 */
function truncateMessagesByBytes(messages, maxBytes) {
  // Early return for empty or invalid input
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }

  // strip inline media first. This will often get us below the threshold,
  // while preserving human-readable information about messages sent.
  const stripped = stripInlineMediaFromMessages(messages);

  // Fast path: if all messages fit, return as-is
  const totalBytes = jsonBytes(stripped);
  if (totalBytes <= maxBytes) {
    return stripped;
  }

  // Precompute each message's JSON size once for efficiency
  const messageSizes = stripped.map(jsonBytes);

  // Find the largest suffix (newest messages) that fits within the budget
  let bytesUsed = 0;
  let startIndex = stripped.length; // Index where the kept suffix starts

  for (let i = stripped.length - 1; i >= 0; i--) {
    const messageSize = messageSizes[i];

    if (messageSize && bytesUsed + messageSize > maxBytes) {
      // Adding this message would exceed the budget
      break;
    }

    if (messageSize) {
      bytesUsed += messageSize;
    }
    startIndex = i;
  }

  // If no complete messages fit, try truncating just the newest message
  if (startIndex === stripped.length) {
    // we're truncating down to one message, so all others dropped.
    const newestMessage = stripped[stripped.length - 1];
    return truncateSingleMessage(newestMessage, maxBytes);
  }

  // Return the suffix that fits
  return stripped.slice(startIndex);
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
