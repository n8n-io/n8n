import { Z } from '@n8n/api-types';
import { z } from 'zod';

const isLocalhost = (hostname: string): boolean =>
	hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

const redirectUriSchema = z
	.string()
	.trim()
	.url('Invalid URL format')
	.superRefine((uri, ctx) => {
		const { protocol, hostname } = new URL(uri);

		if (protocol !== 'http:' && protocol !== 'https:') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Invalid protocol for redirect URI: ${uri}. Only http and https are allowed.`,
			});
			return;
		}

		const requiresHttps = process.env.NODE_ENV !== 'development' && !isLocalhost(hostname);
		if (requiresHttps && protocol !== 'https:') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `HTTPS required for redirect URI: ${uri}`,
			});
		}
	});

export class UpdateAllowedRedirectUrisDto extends Z.class({
	uris: z.preprocess(
		(value) =>
			Array.isArray(value)
				? value.filter((item) => typeof item !== 'string' || item.trim().length > 0)
				: value,
		z.array(redirectUriSchema),
	),
}) {}
