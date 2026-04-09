import {
  LanguageModelV3Message,
  LanguageModelV3Prompt,
} from '@ai-sdk/provider';
import { convertDataContentToBase64String } from '../prompt/data-content';

/**
 * Helper utility to serialize prompt content for OpenTelemetry tracing.
 * It is initially created because normalized LanguageModelV3Prompt carries
 * images as Uint8Arrays, on which JSON.stringify acts weirdly, converting
 * them to objects with stringified indices as keys, e.g. {"0": 42, "1": 69 }.
 */
export function stringifyForTelemetry(prompt: LanguageModelV3Prompt): string {
  return JSON.stringify(
    prompt.map((message: LanguageModelV3Message) => ({
      ...message,
      content:
        typeof message.content === 'string'
          ? message.content
          : message.content.map(part =>
              part.type === 'file'
                ? {
                    ...part,
                    data:
                      part.data instanceof Uint8Array
                        ? convertDataContentToBase64String(part.data)
                        : part.data,
                  }
                : part,
            ),
    })),
  );
}
