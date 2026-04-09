import { createProviderToolFactoryWithOutputSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

const viewImageOutputSchema = z.object({
  description: z.string().describe('description of the image'),
  objects: z
    .array(z.string())
    .optional()
    .describe('objects detected in the image'),
});

const viewImageToolFactory = createProviderToolFactoryWithOutputSchema({
  id: 'xai.view_image',
  inputSchema: z.object({}).describe('no input parameters'),
  outputSchema: viewImageOutputSchema,
});

export const viewImage = (
  args: Parameters<typeof viewImageToolFactory>[0] = {},
) => viewImageToolFactory(args);
