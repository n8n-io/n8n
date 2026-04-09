import { createProviderToolFactoryWithOutputSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

/**
 * A tool that enables the model to generate and run Python code.
 *
 * @note Ensure the selected model supports Code Execution.
 * Multi-tool usage with the code execution tool is typically compatible with Gemini >=2 models.
 *
 * @see https://ai.google.dev/gemini-api/docs/code-execution (Google AI)
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/code-execution-api (Vertex AI)
 */
export const codeExecution = createProviderToolFactoryWithOutputSchema<
  {
    language: string;
    code: string;
  },
  {
    outcome: string;
    output: string;
  },
  {}
>({
  id: 'google.code_execution',
  inputSchema: z.object({
    language: z.string().describe('The programming language of the code.'),
    code: z.string().describe('The code to be executed.'),
  }),
  outputSchema: z.object({
    outcome: z
      .string()
      .describe('The outcome of the execution (e.g., "OUTCOME_OK").'),
    output: z.string().describe('The output from the code execution.'),
  }),
});
