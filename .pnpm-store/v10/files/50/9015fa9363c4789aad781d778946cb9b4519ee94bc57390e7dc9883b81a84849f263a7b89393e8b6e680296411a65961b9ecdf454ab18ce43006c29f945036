import type {
  LanguageModelV3Content,
  LanguageModelV3StreamPart,
} from '@ai-sdk/provider';
import { LanguageModelMiddleware } from '../types/language-model-middleware';
import { getPotentialStartIndex } from '../util/get-potential-start-index';

/**
 * Extracts an XML-tagged reasoning section from the generated text and exposes it
 * as a `reasoning` property on the result.
 *
 * @param tagName - The name of the XML tag to extract reasoning from.
 * @param separator - The separator to use between reasoning and text sections.
 * @param startWithReasoning - Whether to start with reasoning tokens.
 */
export function extractReasoningMiddleware({
  tagName,
  separator = '\n',
  startWithReasoning = false,
}: {
  tagName: string;
  separator?: string;
  startWithReasoning?: boolean;
}): LanguageModelMiddleware {
  const openingTag = `<${tagName}>`;
  const closingTag = `<\/${tagName}>`;

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

        const text = startWithReasoning ? openingTag + part.text : part.text;

        const regexp = new RegExp(`${openingTag}(.*?)${closingTag}`, 'gs');
        const matches = Array.from(text.matchAll(regexp));

        if (!matches.length) {
          transformedContent.push(part);
          continue;
        }

        const reasoningText = matches.map(match => match[1]).join(separator);

        let textWithoutReasoning = text;
        for (let i = matches.length - 1; i >= 0; i--) {
          const match = matches[i];

          const beforeMatch = textWithoutReasoning.slice(0, match.index);
          const afterMatch = textWithoutReasoning.slice(
            match.index! + match[0].length,
          );

          textWithoutReasoning =
            beforeMatch +
            (beforeMatch.length > 0 && afterMatch.length > 0 ? separator : '') +
            afterMatch;
        }

        transformedContent.push({
          type: 'reasoning',
          text: reasoningText,
        });

        transformedContent.push({
          type: 'text',
          text: textWithoutReasoning,
        });
      }

      return { content: transformedContent, ...rest };
    },

    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();

      const reasoningExtractions: Record<
        string,
        {
          isFirstReasoning: boolean;
          isFirstText: boolean;
          afterSwitch: boolean;
          isReasoning: boolean;
          buffer: string;
          idCounter: number;
          textId: string;
        }
      > = {};

      let delayedTextStart: LanguageModelV3StreamPart | undefined;

      return {
        stream: stream.pipeThrough(
          new TransformStream<
            LanguageModelV3StreamPart,
            LanguageModelV3StreamPart
          >({
            transform: (chunk, controller) => {
              // do not send `text-start` before `reasoning-start`
              // https://github.com/vercel/ai/issues/7774
              if (chunk.type === 'text-start') {
                delayedTextStart = chunk;
                return;
              }

              if (chunk.type === 'text-end' && delayedTextStart) {
                controller.enqueue(delayedTextStart);
                delayedTextStart = undefined;
              }

              if (chunk.type !== 'text-delta') {
                controller.enqueue(chunk);
                return;
              }

              if (reasoningExtractions[chunk.id] == null) {
                reasoningExtractions[chunk.id] = {
                  isFirstReasoning: true,
                  isFirstText: true,
                  afterSwitch: false,
                  isReasoning: startWithReasoning,
                  buffer: '',
                  idCounter: 0,
                  textId: chunk.id,
                };
              }

              const activeExtraction = reasoningExtractions[chunk.id];

              activeExtraction.buffer += chunk.delta;

              function publish(text: string) {
                if (text.length > 0) {
                  const prefix =
                    activeExtraction.afterSwitch &&
                    (activeExtraction.isReasoning
                      ? !activeExtraction.isFirstReasoning
                      : !activeExtraction.isFirstText)
                      ? separator
                      : '';

                  if (
                    activeExtraction.isReasoning &&
                    (activeExtraction.afterSwitch ||
                      activeExtraction.isFirstReasoning)
                  ) {
                    controller.enqueue({
                      type: 'reasoning-start',
                      id: `reasoning-${activeExtraction.idCounter}`,
                    });
                  }

                  if (activeExtraction.isReasoning) {
                    controller.enqueue({
                      type: 'reasoning-delta',
                      delta: prefix + text,
                      id: `reasoning-${activeExtraction.idCounter}`,
                    });
                  } else {
                    if (delayedTextStart) {
                      controller.enqueue(delayedTextStart);
                      delayedTextStart = undefined;
                    }
                    controller.enqueue({
                      type: 'text-delta',
                      delta: prefix + text,
                      id: activeExtraction.textId,
                    });
                  }
                  activeExtraction.afterSwitch = false;

                  if (activeExtraction.isReasoning) {
                    activeExtraction.isFirstReasoning = false;
                  } else {
                    activeExtraction.isFirstText = false;
                  }
                }
              }

              do {
                const nextTag = activeExtraction.isReasoning
                  ? closingTag
                  : openingTag;

                const startIndex = getPotentialStartIndex(
                  activeExtraction.buffer,
                  nextTag,
                );

                // no opening or closing tag found, publish the buffer
                if (startIndex == null) {
                  publish(activeExtraction.buffer);
                  activeExtraction.buffer = '';
                  break;
                }

                // publish text before the tag
                publish(activeExtraction.buffer.slice(0, startIndex));

                const foundFullMatch =
                  startIndex + nextTag.length <= activeExtraction.buffer.length;

                if (foundFullMatch) {
                  activeExtraction.buffer = activeExtraction.buffer.slice(
                    startIndex + nextTag.length,
                  );

                  if (activeExtraction.isReasoning) {
                    // Emit reasoning-start for empty reasoning blocks (no delta was published).
                    // This handles both cases:
                    // - startWithReasoning=false: <think></think> (afterSwitch=true)
                    // - startWithReasoning=true: immediate </think> (afterSwitch=false)
                    if (activeExtraction.isFirstReasoning) {
                      controller.enqueue({
                        type: 'reasoning-start',
                        id: `reasoning-${activeExtraction.idCounter}`,
                      });
                    }

                    // reasoning part finished:
                    controller.enqueue({
                      type: 'reasoning-end',
                      id: `reasoning-${activeExtraction.idCounter++}`,
                    });
                  }

                  activeExtraction.isReasoning = !activeExtraction.isReasoning;
                  activeExtraction.afterSwitch = true;
                } else {
                  activeExtraction.buffer =
                    activeExtraction.buffer.slice(startIndex);
                  break;
                }
              } while (true);
            },
          }),
        ),
        ...rest,
      };
    },
  };
}
