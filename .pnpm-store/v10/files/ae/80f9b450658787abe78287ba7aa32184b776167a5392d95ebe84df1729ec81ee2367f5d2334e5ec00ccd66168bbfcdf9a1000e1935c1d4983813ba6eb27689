import { delay as originalDelay } from '@ai-sdk/provider-utils';
import { SharedV3ProviderMetadata } from '@ai-sdk/provider';
import { TextStreamPart } from './stream-text-result';
import { ToolSet } from './tool-set';
import { InvalidArgumentError } from '@ai-sdk/provider';

const CHUNKING_REGEXPS = {
  word: /\S+\s+/m,
  line: /\n+/m,
};

/**
 * Detects the first chunk in a buffer.
 *
 * @param buffer - The buffer to detect the first chunk in.
 *
 * @returns The first detected chunk, or `undefined` if no chunk was detected.
 */
export type ChunkDetector = (buffer: string) => string | undefined | null;

/**
 * Smooths text and reasoning streaming output.
 *
 * @param delayInMs - The delay in milliseconds between each chunk. Defaults to 10ms. Can be set to `null` to skip the delay.
 * @param chunking - Controls how the text is chunked for streaming. Use "word" to stream word by word (default), "line" to stream line by line, provide a custom RegExp pattern for custom chunking, provide an Intl.Segmenter for locale-aware word segmentation (recommended for CJK languages), or provide a custom ChunkDetector function.
 *
 * @returns A transform stream that smooths text streaming output.
 */
export function smoothStream<TOOLS extends ToolSet>({
  delayInMs = 10,
  chunking = 'word',
  _internal: { delay = originalDelay } = {},
}: {
  delayInMs?: number | null;
  chunking?: 'word' | 'line' | RegExp | ChunkDetector | Intl.Segmenter;
  /**
   * Internal. For test use only. May change without notice.
   */
  _internal?: {
    delay?: (delayInMs: number | null) => Promise<void>;
  };
} = {}): (options: {
  tools: TOOLS;
}) => TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>> {
  let detectChunk: ChunkDetector;

  // Check if chunking is an Intl.Segmenter (duck-typing for segment method)
  if (
    chunking != null &&
    typeof chunking === 'object' &&
    'segment' in chunking &&
    typeof chunking.segment === 'function'
  ) {
    const segmenter = chunking as Intl.Segmenter;
    detectChunk = (buffer: string) => {
      if (buffer.length === 0) return null;
      const iterator = segmenter.segment(buffer)[Symbol.iterator]();
      const first = iterator.next().value;
      return first?.segment || null;
    };
  } else if (typeof chunking === 'function') {
    detectChunk = buffer => {
      const match = chunking(buffer);

      if (match == null) {
        return null;
      }

      if (!match.length) {
        throw new Error(`Chunking function must return a non-empty string.`);
      }

      if (!buffer.startsWith(match)) {
        throw new Error(
          `Chunking function must return a match that is a prefix of the buffer. Received: "${match}" expected to start with "${buffer}"`,
        );
      }

      return match;
    };
  } else {
    const chunkingRegex =
      typeof chunking === 'string'
        ? CHUNKING_REGEXPS[chunking]
        : chunking instanceof RegExp
          ? chunking
          : undefined;

    if (chunkingRegex == null) {
      throw new InvalidArgumentError({
        argument: 'chunking',
        message: `Chunking must be "word", "line", a RegExp, an Intl.Segmenter, or a ChunkDetector function. Received: ${chunking}`,
      });
    }

    detectChunk = buffer => {
      const match = chunkingRegex.exec(buffer);

      if (!match) {
        return null;
      }

      return buffer.slice(0, match.index) + match?.[0];
    };
  }

  return () => {
    let buffer = '';
    let id = '';
    let type: 'text-delta' | 'reasoning-delta' | undefined = undefined;
    let providerMetadata: SharedV3ProviderMetadata | undefined = undefined;

    function flushBuffer(
      controller: TransformStreamDefaultController<TextStreamPart<TOOLS>>,
    ) {
      if (buffer.length > 0 && type !== undefined) {
        controller.enqueue({
          type,
          text: buffer,
          id,
          ...(providerMetadata != null ? { providerMetadata } : {}),
        });
        buffer = '';
        providerMetadata = undefined;
      }
    }

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      async transform(chunk, controller) {
        // Handle non-smoothable chunks: flush buffer and pass through
        if (chunk.type !== 'text-delta' && chunk.type !== 'reasoning-delta') {
          flushBuffer(controller);
          controller.enqueue(chunk);
          return;
        }

        // Flush buffer when type or id changes
        if ((chunk.type !== type || chunk.id !== id) && buffer.length > 0) {
          flushBuffer(controller);
        }

        buffer += chunk.text;
        id = chunk.id;
        type = chunk.type;

        // Preserve providerMetadata (e.g., Anthropic thinking signatures)
        if (chunk.providerMetadata != null) {
          providerMetadata = chunk.providerMetadata;
        }

        let match;

        while ((match = detectChunk(buffer)) != null) {
          controller.enqueue({ type, text: match, id });
          buffer = buffer.slice(match.length);

          await delay(delayInMs);
        }
      },
    });
  };
}
