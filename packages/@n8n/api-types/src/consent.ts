import { z } from 'zod';

export type { ConsentRefusal, ConsentUiHints } from '@n8n/inbound-auth';

/**
 * Why a resource refused a person, with the names that the refusal screen shows. The consent
 * details send it in the `meta` of a 403 when the resource says why it refused.
 */
export const consentRefusalDetailsSchema = z.object({
	reason: z.string(),
	projectName: z.string().optional(),
	resourceName: z.string().optional(),
	uiHints: z.object({ icon: z.string().optional(), consentType: z.string().optional() }).optional(),
});
export type ConsentRefusalDetails = z.infer<typeof consentRefusalDetailsSchema>;
