import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const INSTANCE_AI_TELEMETRY = defineTelemetryEvents({
	BUILDER_SPECCED_TEMPLATED_CRED: {
		name: 'Builder specced templated cred',
		description:
			'The Instance AI workflow builder composed a Simplified Custom Auth recipe (credentialHints) and suspended to show its setup card. Captures the recipe fields so template and link quality are observable in production — one event per recipe in the suspension. Contains no secrets by construction: recipes are agent-authored before any user input.',
		properties: z.object({
			thread_id: z.string(),
			input_thread_id: z
				.string()
				.describe("Joins with 'Builder asked for input' / 'User finished providing input'"),
			template: z
				.record(z.string(), z.unknown())
				.describe('Auth request parts with {{placeholder}} markers, never real values'),
			placeholders: z
				.array(z.record(z.string(), z.unknown()))
				.describe('Placeholder defs (name, title, info, type, optional)'),
			test_url: z.string().optional(),
			docs_url: z
				.string()
				.optional()
				.describe('Provider key page the credential help thread directs the user to'),
			service_host: z
				.string()
				.optional()
				.describe('API host the recipe targets (server-derived) — groups events by service'),
			accepted_status_codes: z
				.array(z.number())
				.optional()
				.describe('No longer model-suppliable; expected absent — presence flags a regression'),
		}),
	},
});
