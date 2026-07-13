import { z } from 'zod';

export const EncryptedMetadataSchema = z.object({
	encryptedMetadata: z.string(),
});

export const N8NOAuth2ExtractorMetadataSchema = z.object({
	authToken: z.string(),
	resource: z.string(),
});

export type EncryptedMetadata = z.infer<typeof EncryptedMetadataSchema>;
export type N8NOAuth2ExtractorMetadata = z.infer<typeof N8NOAuth2ExtractorMetadataSchema>;
