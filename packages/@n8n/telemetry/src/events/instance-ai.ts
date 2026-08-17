import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const freeNudgeVariant = z.enum(['control', 'variant-1', 'variant-2']);
const freeNudgeTreatmentVariant = z.enum(['variant-1', 'variant-2']);

export const INSTANCE_AI_TELEMETRY = defineTelemetryEvents({
	USER_CLICKED_AI_CREDIT_BALANCE: {
		name: 'User clicked AI credit balance',
		description:
			'The user clicked the AI Assistant credit balance button to open or close the balance dropdown.',
		properties: z.object({}),
	},
	FREE_NUDGE_EXPOSED: {
		name: 'Instance AI free nudge exposed',
		description:
			'An eligible user reached the Instance AI empty state for the free-use nudge experiment, including the control variant.',
		properties: z.object({
			variant: freeNudgeVariant,
			// eslint-disable-next-line @typescript-eslint/naming-convention -- PostHog feature property
			'$feature/105_instance_ai_free_nudge': freeNudgeVariant,
		}),
	},
	FREE_NUDGE_DISMISSED: {
		name: 'Instance AI free nudge dismissed',
		description: 'The user dismissed a visible Instance AI free-use nudge.',
		properties: z.object({
			variant: freeNudgeTreatmentVariant,
			// eslint-disable-next-line @typescript-eslint/naming-convention -- PostHog feature property
			'$feature/105_instance_ai_free_nudge': freeNudgeTreatmentVariant,
		}),
	},
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
