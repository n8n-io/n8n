import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const backendFlowConfigSchema = z.object({
	secret: z.string(),
});

export type BackendFlowConfig = z.infer<typeof backendFlowConfigSchema>;

const quickConnectOptionSchema = z.object({
	packageName: z.string(),
	credentialType: z.string(),
	text: z.string(),
	quickConnectType: z.string(),
	serviceName: z.string(),
	consentText: z.string().optional(),
	backendFlowConfig: backendFlowConfigSchema.optional(),
});

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
