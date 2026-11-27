import { UpdateApiKeyRequestDto } from '@n8n/api-types';
import { z } from 'zod';

export const ownerKeyExchangePath = '/auth/api-key';

export class OwnerKeyExchangeDto extends UpdateApiKeyRequestDto.extend({
	email: z.string().trim().email().max(254).toLowerCase(),
	password: z.string().min(1),
	mfaCode: z
		.string()
		.regex(/^\d{6}$/)
		.optional(),
	expiresInDays: z.number().int().min(1).max(90),
}) {}

export const issuedKeySchema = z.object({
	id: z.string(),
	apiKey: z.string(),
	expiresAt: z.number().int(),
});
