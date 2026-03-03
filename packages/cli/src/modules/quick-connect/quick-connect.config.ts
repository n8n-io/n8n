import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const baseQuickConnectOptionSchema = z.object({
	packageName: z.string(),
	credentialType: z.string(),
	text: z.string(),
	quickConnectType: z.string(),
	consentText: z.string().optional(),
	config: z.never().optional(),
	backendFlowConfig: z.never().optional(),
});

const pineconeQuickConnectOptionSchema = baseQuickConnectOptionSchema.extend({
	quickConnectType: z.literal('pinecone'),
	config: z.object({
		integrationId: z.string(),
	}),
});

const firecrawlQuickConnectSchema = baseQuickConnectOptionSchema.extend({
	quickConnectType: z.literal('firecrawl'),
	consentText: z.string(),
	backendFlowConfig: z.object({
		secret: z.string(),
	}),
});

export type FirecrawlQuickConnect = z.infer<typeof firecrawlQuickConnectSchema>;

const quickConnectOptionSchema = z.union([
	firecrawlQuickConnectSchema,
	pineconeQuickConnectOptionSchema,
	baseQuickConnectOptionSchema,
]);

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
