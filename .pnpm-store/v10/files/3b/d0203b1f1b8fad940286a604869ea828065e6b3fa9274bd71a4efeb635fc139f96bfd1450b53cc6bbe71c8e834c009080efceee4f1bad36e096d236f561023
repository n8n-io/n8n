import { JSONObject, LanguageModelV3FunctionTool } from '@ai-sdk/provider';
import { LanguageModelMiddleware } from '../types';

function defaultFormatExample(example: { input: JSONObject }): string {
  return JSON.stringify(example.input);
}

/**
 * Middleware that appends input examples to tool descriptions.
 *
 * This is useful for providers that don't natively support the `inputExamples`
 * property. The middleware serializes examples into the tool's description text.
 *
 * @param options - Configuration options for the middleware.
 * @param options.prefix - A prefix to prepend before the examples. Default: 'Input Examples:'
 * @param options.format - Optional custom formatter for each example.
 *   Receives the example object and its index. Default: JSON.stringify(example.input)
 * @param options.remove - Whether to remove the inputExamples property
 *   after adding them to the description. Default: true
 *
 * @example
 * ```ts
 * import { wrapLanguageModel, addToolInputExamplesMiddleware } from 'ai';
 *
 * const model = wrapLanguageModel({
 *   model: yourModel,
 *   middleware: addToolInputExamplesMiddleware(),
 * });
 * ```
 */
export function addToolInputExamplesMiddleware({
  prefix = 'Input Examples:',
  format = defaultFormatExample,
  remove = true,
}: {
  /**
   * A prefix to prepend before the examples.
   */
  prefix?: string;

  /**
   * Optional custom formatter for each example.
   * Receives the example object and its index.
   * Default: JSON.stringify(example.input)
   */
  format?: (example: { input: JSONObject }, index: number) => string;

  /**
   * Whether to remove the inputExamples property after adding them to the description.
   * Default: true
   */
  remove?: boolean;
} = {}): LanguageModelMiddleware {
  return {
    specificationVersion: 'v3',
    transformParams: async ({ params }) => {
      if (!params.tools?.length) {
        return params;
      }

      const transformedTools = params.tools.map(tool => {
        // Only transform function tools that have inputExamples
        if (tool.type !== 'function' || !tool.inputExamples?.length) {
          return tool;
        }

        const formattedExamples = tool.inputExamples
          .map((example, index) => format(example, index))
          .join('\n');

        const examplesSection = `${prefix}\n${formattedExamples}`;

        const toolDescription = tool.description
          ? `${tool.description}\n\n${examplesSection}`
          : examplesSection;

        return {
          ...tool,
          description: toolDescription,
          inputExamples: remove ? undefined : tool.inputExamples,
        } satisfies LanguageModelV3FunctionTool;
      });

      return {
        ...params,
        tools: transformedTools,
      };
    },
  };
}
