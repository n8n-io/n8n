import { z } from 'zod/v4';

export const assistantSurfaceSchema = z
	.enum(['aia', 'mcp'])
	.describe('Assistant surface that acted. The settings area cannot fire this event');

/** The runtimes that run an n8n Assistant thread. */
export const ASSISTANT_RUNTIMES = ['instance-ai', 'agents'] as const;
export type AssistantRuntime = (typeof ASSISTANT_RUNTIMES)[number];
export const assistantRuntimeSchema = z
	.enum(ASSISTANT_RUNTIMES)
	.describe(
		"The runtime that runs the thread: 'instance-ai' is the current Assistant runtime, 'agents' is the Assistant agent on the Agents runtime",
	);

export const publicApiClientSchema = z
	.enum(['editor_ui', 'other'])
	.describe(
		'Set when public_api is true. editor_ui when the n8n editor called the route, other for any other client.',
	);
