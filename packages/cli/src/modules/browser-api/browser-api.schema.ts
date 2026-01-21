import { z } from 'zod';

/**
 * Reusable HTTP/HTTPS URL validator.
 * Ensures URLs use only http: or https: protocols to prevent javascript:, data:, or other schemes.
 */
const httpUrlSchema = z
	.string()
	.url()
	.refine(
		(url) => {
			try {
				const parsed = new URL(url);
				return parsed.protocol === 'http:' || parsed.protocol === 'https:';
			} catch {
				return false;
			}
		},
		{ message: 'URL must use http or https protocol' },
	);

/**
 * Schema for browser notification payloads.
 * Validates title length, body length, and icon URL protocol.
 */
export const browserApiNotificationSchema = z.object({
	type: z.literal('notification'),
	notification: z.object({
		title: z.string().min(1).max(256),
		body: z.string().max(1024).optional(),
		icon: httpUrlSchema.optional(),
	}),
});

/**
 * Schema for browser play sound payloads.
 * Validates sound type, volume range, and URL protocol.
 * Note: Custom URL requirement is validated in the main browserApiDataSchema.
 */
export const browserApiPlaySoundSchema = z.object({
	type: z.literal('playSound'),
	playSound: z.object({
		sound: z.enum(['success', 'error', 'warning', 'info', 'custom']),
		url: httpUrlSchema.optional(),
		volume: z.number().min(0).max(1).optional(),
	}),
});

/**
 * Discriminated union schema for all browser API payloads.
 * Use this for runtime validation of browserApi metadata.
 * Includes a refinement to ensure custom sounds have a URL.
 */
export const browserApiDataSchema = z
	.discriminatedUnion('type', [browserApiNotificationSchema, browserApiPlaySoundSchema])
	.refine(
		(data) => {
			if (data.type === 'playSound' && data.playSound.sound === 'custom') {
				return data.playSound.url !== undefined;
			}
			return true;
		},
		{ message: 'URL is required when sound is "custom"' },
	);

export type ValidatedBrowserApiData = z.infer<typeof browserApiDataSchema>;
