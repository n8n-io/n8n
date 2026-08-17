import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

/**
 * How each AI Assistant setup component is configured. Source (who set it) and
 * type/provider (what it is) are separate properties on purpose: an env-var
 * Daytona sandbox reports sandbox_source 'env' and sandbox_type 'daytona',
 * so neither dimension shadows the other.
 */
const setupSnapshotProps = {
	model_source: z
		.enum(['ui', 'env', 'none'])
		.describe('Whether the model is configured via a UI credential, env vars, or not at all'),
	model_provider: z
		.string()
		.nullable()
		.describe("Model provider, e.g. 'anthropic'. Null when not configured or not derivable"),
	model_name: z
		.string()
		.nullable()
		.describe(
			'Selected model name. Null when not configured; on the page-view event also null when the name is env-managed, which the emitting frontend cannot resolve — "AI Assistant setup completed" carries the resolved name',
		),
	sandbox_source: z.enum(['ui', 'env', 'none']),
	sandbox_type: z.enum(['n8n-sandbox', 'daytona']).nullable(),
	web_search_source: z
		.enum(['ui', 'env', 'disabled', 'none'])
		.describe(
			"'disabled' means the admin explicitly turned web search off, which counts as decided",
		),
	web_search_provider: z.enum(['brave', 'searxng']).nullable(),
};

export const INSTANCE_AI_TELEMETRY = defineTelemetryEvents({
	USER_CLICKED_AI_CREDIT_BALANCE: {
		name: 'User clicked AI credit balance',
		description:
			'The user clicked the AI Assistant credit balance button to open or close the balance dropdown.',
		properties: z.object({}),
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
	USER_VIEWED_AI_ASSISTANT_SETUP_PAGE: {
		name: 'User viewed AI Assistant setup page',
		description:
			'The user landed on a self-hosted AI Assistant setup surface: the onboarding takeover on /assistant, or the settings page on /settings/assistant. Carries the configuration snapshot at view time, so joined with "AI Assistant setup completed" it measures setup drop-off. Not emitted on cloud or proxy deployments, where setup is managed.',
		properties: z.object({
			page: z
				.enum(['onboarding', 'settings'])
				.describe('Which setup surface: the first-run onboarding wizard or the settings page'),
			...setupSnapshotProps,
		}),
	},
	USER_CONFIGURED_AI_ASSISTANT_MODEL: {
		name: 'User configured AI Assistant model',
		description:
			'An admin saved an AI Assistant model connection (PUT /instance-ai/settings), covering the first connect, later changes, and same-provider key rotations: first connects are rows where previous_provider is absent. The event marks a saved configuration, not a verified one — the setup wizard verifies before saving, but a direct API save can skip verification. Env-var model config never emits this; it is visible on "Instance started" and on the snapshot events instead.',
		properties: z.object({
			provider: z
				.string()
				.describe("Model provider derived from the credential type, e.g. 'anthropic'"),
			model: z.string(),
			previous_provider: z
				.string()
				.optional()
				.describe(
					'Absent when nothing was configured before — an absent value marks a first connect',
				),
			previous_model: z.string().optional(),
		}),
	},
	USER_CONFIGURED_AI_ASSISTANT_SANDBOX: {
		name: 'User configured AI Assistant sandbox',
		description:
			'An admin saved an AI Assistant sandbox connection (PUT /instance-ai/settings), covering the first connect, later changes, and same-provider key rotations: first connects are rows where previous_sandbox_type is absent. Env-var sandbox config never emits this.',
		properties: z.object({
			sandbox_type: z.enum(['n8n-sandbox', 'daytona']),
			previous_sandbox_type: z
				.enum(['n8n-sandbox', 'daytona'])
				.optional()
				.describe(
					'Absent when nothing was configured before — an absent value marks a first connect',
				),
		}),
	},
	USER_CONFIGURED_AI_ASSISTANT_WEB_SEARCH: {
		name: 'User configured AI Assistant web search',
		description:
			'An admin saved an AI Assistant web search connection (PUT /instance-ai/settings), covering the first connect, later changes, and same-provider key rotations: first connects are rows where previous_provider is absent. Explicitly disabling web search does not emit this; that decision is visible as web_search_source "disabled" on the snapshot events.',
		properties: z.object({
			provider: z.enum(['brave', 'searxng']),
			previous_provider: z
				.enum(['brave', 'searxng'])
				.optional()
				.describe(
					'Absent when nothing was configured before — an absent value marks a first connect',
				),
		}),
	},
	AI_ASSISTANT_CONNECTION_FAILED: {
		name: 'AI Assistant connection failed',
		description:
			'A setup verification call (POST /instance-ai/settings/verify/*) failed for a model, sandbox, or web search connection. One event covers all three components; the component property tells them apart. Fires once per failed verify attempt, including retries.',
		properties: z.object({
			component: z.enum(['model', 'sandbox', 'web_search']),
			provider: z
				.string()
				.nullable()
				.describe(
					'Provider being verified, when known — model provider, sandbox type, or search provider',
				),
			failure: z
				.enum([
					'unauthorized',
					'forbidden',
					'quota_exceeded',
					'rate_limited',
					'timeout',
					'unreachable',
					'invalid_response',
					'provider_error',
				])
				.describe('Classified failure, same taxonomy the verify response returns to the UI'),
			error_message: z
				.string()
				.describe(
					'Sanitized provider error: URL queries stripped, length capped, never key values',
				),
		}),
	},
	AI_ASSISTANT_SETUP_COMPLETED: {
		name: 'AI Assistant setup completed',
		description:
			'A self-hosted instance reached a complete AI Assistant setup for the first time: model configured, sandbox configured, and web search decided (configured or explicitly disabled) — the same predicate that unlocks the assistant UI. Fires at most once per instance, guarded by a persisted settings key, regardless of how the last piece was set: emitted from the settings save path, with a boot-time check so an env-var finish is also counted. No "User" prefix because the last piece can land via env vars with no acting user.',
		properties: z.object({ ...setupSnapshotProps }),
	},
});
