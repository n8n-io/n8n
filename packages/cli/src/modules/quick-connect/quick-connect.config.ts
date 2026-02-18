import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const baseQuickConnectSchema = z.object({
	packageName: z.string(),
	credentialType: z.string(),
	text: z.string(),
	quickConnectType: z.string(),
	consentText: z.string().optional(),
	backendFlowConfig: z.never().optional(),
});

const firecrawlQuickConnectSchema = baseQuickConnectSchema.extend({
	quickConnectType: z.literal('firecrawl'),
	consentText: z.string(),
	backendFlowConfig: z.object({
		secret: z.string(),
	}),
});

export type FirecrawlQuickConnect = z.infer<typeof firecrawlQuickConnectSchema>;

const quickConnectOptionSchema = z.union([firecrawlQuickConnectSchema, baseQuickConnectSchema]);

export type QuickConnectOption = z.infer<typeof quickConnectOptionSchema>;

const quickConnectOptionsSchema = z.string().pipe(
	z.preprocess((input: string) => {
		try {
			return JSON.parse(input);
		} catch {
			return [];
		}
	}, z.array(quickConnectOptionSchema)),
);

export type QuickConnectOptions = z.infer<typeof quickConnectOptionsSchema>;

@Config
export class QuickConnectConfig {
	/** Promoted quick connect options */
	@Env('N8N_QUICK_CONNECT_OPTIONS', quickConnectOptionsSchema)
	options: QuickConnectOptions = [];
}
