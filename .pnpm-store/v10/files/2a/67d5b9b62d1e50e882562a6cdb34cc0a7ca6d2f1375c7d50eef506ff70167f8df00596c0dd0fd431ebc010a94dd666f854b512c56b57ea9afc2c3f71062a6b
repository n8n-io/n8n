import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const xSearchArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      allowedXHandles: z.array(z.string()).max(10).optional(),
      excludedXHandles: z.array(z.string()).max(10).optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      enableImageUnderstanding: z.boolean().optional(),
      enableVideoUnderstanding: z.boolean().optional(),
    }),
  ),
);

const xSearchOutputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      query: z.string(),
      posts: z.array(
        z.object({
          author: z.string(),
          text: z.string(),
          url: z.string(),
          likes: z.number(),
        }),
      ),
    }),
  ),
);

const xSearchToolFactory = createProviderToolFactoryWithOutputSchema<
  {},
  {
    query: string;
    posts: Array<{
      author: string;
      text: string;
      url: string;
      likes: number;
    }>;
  },
  {
    allowedXHandles?: string[];
    excludedXHandles?: string[];
    fromDate?: string;
    toDate?: string;
    enableImageUnderstanding?: boolean;
    enableVideoUnderstanding?: boolean;
  }
>({
  id: 'xai.x_search',
  inputSchema: lazySchema(() => zodSchema(z.object({}))),
  outputSchema: xSearchOutputSchema,
});

export const xSearch = (args: Parameters<typeof xSearchToolFactory>[0] = {}) =>
  xSearchToolFactory(args);
