import {
  createProviderToolFactory,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const customArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      format: z
        .union([
          z.object({
            type: z.literal('grammar'),
            syntax: z.enum(['regex', 'lark']),
            definition: z.string(),
          }),
          z.object({
            type: z.literal('text'),
          }),
        ])
        .optional(),
    }),
  ),
);

const customInputSchema = lazySchema(() => zodSchema(z.string()));

export const customToolFactory = createProviderToolFactory<
  string,
  {
    /**
     * The name of the custom tool, used to identify it in the API.
     */
    name: string;

    /**
     * An optional description of what the tool does.
     */
    description?: string;

    /**
     * The output format specification for the tool.
     * Omit for unconstrained text output.
     */
    format?:
      | {
          type: 'grammar';
          syntax: 'regex' | 'lark';
          definition: string;
        }
      | {
          type: 'text';
        };
  }
>({
  id: 'openai.custom',
  inputSchema: customInputSchema,
});

export const customTool = (args: Parameters<typeof customToolFactory>[0]) =>
  customToolFactory(args);
