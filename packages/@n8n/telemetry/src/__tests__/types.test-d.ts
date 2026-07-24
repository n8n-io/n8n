import { z } from 'zod/v4';

import type { InferTelemetryProps, TelemetryEventDef } from '../define';
import { defineTelemetryEvents } from '../define';

const FIXTURE = defineTelemetryEvents({
	USER_CLICKED_EXECUTE_WORKFLOW: {
		name: 'User clicked execute workflow button',
		description: 'Fires when the user clicks the execute workflow button.',
		properties: z.object({
			workflow_id: z.string(),
			source: z.enum(['canvas', 'ndv']),
			push_ref: z.string().optional(),
		}),
	},
	USER_PINNED_NODE_DATA: {
		name: 'User pinned node data',
		description: 'Fires when the user pins run data on a node.',
		properties: z.object({ node_type: z.string() }),
	},
});

declare function track<T extends TelemetryEventDef>(
	event: T,
	properties: InferTelemetryProps<T>,
): void;

track(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, { workflow_id: '1', source: 'canvas' });
track(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, { workflow_id: '1', source: 'ndv', push_ref: 'r1' });

// @ts-expect-error unknown property name
track(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, { workflow_id: '1', source: 'canvas', wrong: true });

// @ts-expect-error value outside the enum
track(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, { workflow_id: '1', source: 'shortcut' });

// @ts-expect-error missing required property
track(FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW, { source: 'canvas' });

// @ts-expect-error a plain string is not a registry entry
track('User clicked execute workflow button', { workflow_id: '1', source: 'canvas' });

declare function trackWithFallback<T extends TelemetryEventDef>(
	event: T,
	properties: InferTelemetryProps<T>,
): void;
declare function trackWithFallback(event: string, properties?: Record<string, unknown>): void;

trackWithFallback(FIXTURE.USER_PINNED_NODE_DATA, { node_type: 'n8n-nodes-base.set' });
trackWithFallback('Some unregistered event', { anything: true });

export const NAME_CHECK: 'User clicked execute workflow button' =
	FIXTURE.USER_CLICKED_EXECUTE_WORKFLOW.name;
