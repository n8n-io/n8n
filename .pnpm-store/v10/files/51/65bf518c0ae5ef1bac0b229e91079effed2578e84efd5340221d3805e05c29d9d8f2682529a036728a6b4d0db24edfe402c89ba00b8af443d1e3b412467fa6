import {
  createProviderToolFactory,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const urlContext = createProviderToolFactory<
  {
    // Url context does not have any input schema, it will directly use the url from the prompt
  },
  {}
>({
  id: 'google.url_context',
  inputSchema: lazySchema(() => zodSchema(z.object({}))),
});
