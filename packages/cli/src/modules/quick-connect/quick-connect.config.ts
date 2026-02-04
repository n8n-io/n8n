import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const quickConnectOptionsSchema = z.string().pipe(
	z.preprocess(
		(input: string) => {
			try {
				return JSON.parse(input);
			} catch {
				return [];
			}
		},
		z.array(
			z.object({
				packageName: z.string(),
				credentialType: z.string(),
				text: z.string(),
				quickConnectType: z.string(),
			}),
		),
	),
);

type QuickConnectOptions = z.infer<typeof quickConnectOptionsSchema>;

@Config
export class QuickConnectConfig {
	/** Promoted quick connect options */
	@Env('N8N_QUICK_CONNECT_OPTIONS', quickConnectOptionsSchema)
	options: QuickConnectOptions = [];
}
