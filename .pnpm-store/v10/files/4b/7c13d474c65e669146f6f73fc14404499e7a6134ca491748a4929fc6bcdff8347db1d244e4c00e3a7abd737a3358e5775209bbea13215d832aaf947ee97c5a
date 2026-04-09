import type {
  LanguageModelV3Content,
  LanguageModelV3StreamPart,
} from '@ai-sdk/provider';
import { LanguageModelMiddleware } from '../types/language-model-middleware';

/**
 * Default transform function that strips markdown code fences from text.
 */
function defaultTransform(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
}

/**
 * Middleware that extracts JSON from text content by stripping
 * markdown code fences and other formatting.
 *
 * This is useful when using Output.object() with models that wrap
 * JSON responses in markdown code blocks.
 *
 * @param options - Configuration options for the middleware.
 * @param options.transform - Custom transform function. If provided, this will be
 * used instead of the default markdown fence stripping.
 */
export function extractJsonMiddleware(options?: {
  /**
   * Custom transform function to apply to text content.
   * Receives the raw text and should return the transformed text.
   * If not provided, the default transform strips markdown code fences.
   */
  transform?: (text: string) => string;
}): LanguageModelMiddleware {
  const transform = options?.transform ?? defaultTransform;
  const hasCustomTransform = options?.transform !== undefined;

  return {
    specificationVersion: 'v3',

    wrapGenerate: async ({ doGenerate }) => {
      const { content, ...rest } = await doGenerate();

      const transformedContent: LanguageModelV3Content[] = [];
      for (const part of content) {
        if (part.type !== 'text') {
          transformedContent.push(part);
          continue;
        }

        transformedContent.push({
          ...part,
          text: transform(part.text),
        });
      }

      return { content: transformedContent, ...rest };
    },
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();

      const textBlocks: Record<
        string,
        {
          startEvent: LanguageModelV3StreamPart;
          phase: 'prefix' | 'streaming' | 'buffering';
          buffer: string;
          prefixStripped: boolean;
        }
      > = {};

      const SUFFIX_BUFFER_SIZE = 12;

      return {
        stream: stream.pipeThrough(
          new TransformStream<
            LanguageModelV3StreamPart,
            LanguageModelV3StreamPart
          >({
            transform: (chunk, controller) => {
              if (chunk.type === 'text-start') {
                textBlocks[chunk.id] = {
                  startEvent: chunk,
                  // Custom transforms need to buffer all content
                  phase: hasCustomTransform ? 'buffering' : 'prefix',
                  buffer: '',
                  prefixStripped: false,
                };
                return;
              }

              if (chunk.type === 'text-delta') {
                const block = textBlocks[chunk.id];
                if (!block) {
                  controller.enqueue(chunk);
                  return;
                }

                block.buffer += chunk.delta;

                // Custom transform: buffer everything, transform at end
                if (block.phase === 'buffering') {
                  return;
                }

                if (block.phase === 'prefix') {
                  // Check if we can determine prefix status
                  if (
                    block.buffer.length > 0 &&
                    !block.buffer.startsWith('`')
                  ) {
                    block.phase = 'streaming';
                    controller.enqueue(block.startEvent);
                  } else if (block.buffer.startsWith('```')) {
                    // Only strip prefix when we have a newline (fence is complete)
                    if (block.buffer.includes('\n')) {
                      const prefixMatch =
                        block.buffer.match(/^```(?:json)?\s*\n/);
                      if (prefixMatch) {
                        block.buffer = block.buffer.slice(
                          prefixMatch[0].length,
                        );
                        block.prefixStripped = true;
                        block.phase = 'streaming';
                        controller.enqueue(block.startEvent);
                      } else {
                        // Has newline but doesn't match fence pattern
                        block.phase = 'streaming';
                        controller.enqueue(block.startEvent);
                      }
                    }
                    // else keep buffering until we see a newline
                  } else if (
                    block.buffer.length >= 3 &&
                    !block.buffer.startsWith('```')
                  ) {
                    block.phase = 'streaming';
                    controller.enqueue(block.startEvent);
                  }
                }

                // Stream content
                if (
                  block.phase === 'streaming' &&
                  block.buffer.length > SUFFIX_BUFFER_SIZE
                ) {
                  const toStream = block.buffer.slice(0, -SUFFIX_BUFFER_SIZE);
                  block.buffer = block.buffer.slice(-SUFFIX_BUFFER_SIZE);
                  controller.enqueue({
                    type: 'text-delta',
                    id: chunk.id,
                    delta: toStream,
                  });
                }
                return;
              }

              if (chunk.type === 'text-end') {
                const block = textBlocks[chunk.id];
                if (block) {
                  if (block.phase === 'prefix' || block.phase === 'buffering') {
                    controller.enqueue(block.startEvent);
                  }

                  let remaining = block.buffer;
                  if (block.phase === 'buffering') {
                    remaining = transform(remaining);
                  } else if (block.prefixStripped) {
                    // strip suffix since prefix already handled
                    remaining = remaining.replace(/\n?```\s*$/, '').trimEnd();
                  } else {
                    // Apply full transform (handles both prefix and suffix)
                    remaining = transform(remaining);
                  }

                  if (remaining.length > 0) {
                    controller.enqueue({
                      type: 'text-delta',
                      id: chunk.id,
                      delta: remaining,
                    });
                  }
                  controller.enqueue(chunk);
                  delete textBlocks[chunk.id];
                  return;
                }
              }
              controller.enqueue(chunk);
            },
          }),
        ),
        ...rest,
      };
    },
  };
}
