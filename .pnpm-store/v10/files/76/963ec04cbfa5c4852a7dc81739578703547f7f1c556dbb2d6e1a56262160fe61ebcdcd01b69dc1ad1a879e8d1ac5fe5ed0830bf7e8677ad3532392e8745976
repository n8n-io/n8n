import type { LanguageModelV3StreamPart } from '@ai-sdk/provider';
import { LanguageModelMiddleware } from '../types';

/**
 * Simulates streaming chunks with the response from a generate call.
 */
export function simulateStreamingMiddleware(): LanguageModelMiddleware {
  return {
    specificationVersion: 'v3',
    wrapStream: async ({ doGenerate }) => {
      const result = await doGenerate();

      let id = 0;

      const simulatedStream = new ReadableStream<LanguageModelV3StreamPart>({
        start(controller) {
          controller.enqueue({
            type: 'stream-start',
            warnings: result.warnings,
          });

          controller.enqueue({ type: 'response-metadata', ...result.response });

          for (const part of result.content) {
            switch (part.type) {
              case 'text': {
                if (part.text.length > 0) {
                  controller.enqueue({ type: 'text-start', id: String(id) });
                  controller.enqueue({
                    type: 'text-delta',
                    id: String(id),
                    delta: part.text,
                  });
                  controller.enqueue({ type: 'text-end', id: String(id) });
                  id++;
                }
                break;
              }
              case 'reasoning': {
                controller.enqueue({
                  type: 'reasoning-start',
                  id: String(id),
                  providerMetadata: part.providerMetadata,
                });
                controller.enqueue({
                  type: 'reasoning-delta',
                  id: String(id),
                  delta: part.text,
                });
                controller.enqueue({ type: 'reasoning-end', id: String(id) });
                id++;
                break;
              }
              default: {
                controller.enqueue(part);
                break;
              }
            }
          }

          controller.enqueue({
            type: 'finish',
            finishReason: result.finishReason,
            usage: result.usage,
            providerMetadata: result.providerMetadata,
          });

          controller.close();
        },
      });

      return {
        stream: simulatedStream,
        request: result.request,
        response: result.response,
      };
    },
  };
}
