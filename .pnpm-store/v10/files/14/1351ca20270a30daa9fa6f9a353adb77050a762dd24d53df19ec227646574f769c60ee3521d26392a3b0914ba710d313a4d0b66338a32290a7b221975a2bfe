import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

/**
 * Schema for file search tool arguments.
 * @see https://docs.x.ai/docs/guides/using-collections/api
 */
export const fileSearchArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      vectorStoreIds: z.array(z.string()),
      maxNumResults: z.number().optional(),
    }),
  ),
);

const fileSearchOutputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      queries: z.array(z.string()),
      results: z
        .array(
          z.object({
            fileId: z.string(),
            filename: z.string(),
            score: z.number().min(0).max(1),
            text: z.string(),
          }),
        )
        .nullable(),
    }),
  ),
);

const fileSearchToolFactory = createProviderToolFactoryWithOutputSchema<
  {},
  {
    /**
     * The search queries that were executed.
     */
    queries: string[];

    /**
     * The results of the file search tool call.
     */
    results:
      | null
      | {
          /**
           * The unique ID of the file.
           */
          fileId: string;

          /**
           * The name of the file.
           */
          filename: string;

          /**
           * The relevance score of the file - a value between 0 and 1.
           */
          score: number;

          /**
           * The text that was retrieved from the file.
           */
          text: string;
        }[];
  },
  {
    /**
     * List of vector store IDs (collection IDs) to search through.
     * @see https://docs.x.ai/docs/guides/using-collections/api
     */
    vectorStoreIds: string[];

    /**
     * Maximum number of search results to return.
     */
    maxNumResults?: number;
  }
>({
  id: 'xai.file_search',
  inputSchema: lazySchema(() => zodSchema(z.object({}))),
  outputSchema: fileSearchOutputSchema,
});

export const fileSearch = (args: Parameters<typeof fileSearchToolFactory>[0]) =>
  fileSearchToolFactory(args);
