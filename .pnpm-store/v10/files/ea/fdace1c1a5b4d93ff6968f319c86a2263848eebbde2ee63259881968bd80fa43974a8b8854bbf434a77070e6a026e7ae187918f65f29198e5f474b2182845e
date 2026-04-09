import {
  createProviderToolFactory,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

/** Tool to retrieve knowledge from the File Search Stores. */
const fileSearchArgsBaseSchema = z
  .object({
    /** The names of the file_search_stores to retrieve from.
     *  Example: `fileSearchStores/my-file-search-store-123`
     */
    fileSearchStoreNames: z
      .array(z.string())
      .describe(
        'The names of the file_search_stores to retrieve from. Example: `fileSearchStores/my-file-search-store-123`',
      ),
    /** The number of file search retrieval chunks to retrieve. */
    topK: z
      .number()
      .int()
      .positive()
      .describe('The number of file search retrieval chunks to retrieve.')
      .optional(),

    /** Metadata filter to apply to the file search retrieval documents.
     *  See https://google.aip.dev/160 for the syntax of the filter expression.
     */
    metadataFilter: z
      .string()
      .describe(
        'Metadata filter to apply to the file search retrieval documents. See https://google.aip.dev/160 for the syntax of the filter expression.',
      )
      .optional(),
  })
  .passthrough();

export type GoogleFileSearchToolArgs = z.infer<typeof fileSearchArgsBaseSchema>;

const fileSearchArgsSchema = lazySchema(() =>
  zodSchema(fileSearchArgsBaseSchema),
);

export const fileSearch = createProviderToolFactory<
  {},
  GoogleFileSearchToolArgs
>({
  id: 'google.file_search',
  inputSchema: fileSearchArgsSchema,
});
