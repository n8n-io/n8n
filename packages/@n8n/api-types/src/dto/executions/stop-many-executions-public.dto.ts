import '../../openapi-extend';

import type { ExecutionStatus } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

/** The statuses this endpoint accepts. Not every execution status can be stopped. */
export const STOPPABLE_PUBLIC_EXECUTION_STATUSES = ['queued', 'running', 'waiting'] as const;

export type StoppablePublicExecutionStatus = (typeof STOPPABLE_PUBLIC_EXECUTION_STATUSES)[number];

/**
 * `queued` is the public name for the internal `new` status, which the Public API has never
 * exposed. `satisfies` pins every target to a real `ExecutionStatus`, so a renamed status breaks
 * the build instead of the endpoint.
 */
export const STOPPABLE_PUBLIC_TO_INTERNAL_STATUS = {
	queued: 'new',
	running: 'running',
	waiting: 'waiting',
} as const satisfies Record<StoppablePublicExecutionStatus, ExecutionStatus>;

export class StopManyExecutionsPublicDto extends Z.class({
	// No `.min(1)`: an empty array has to reach the controller, which answers a 400 body that
	// predates the standard one.
	status: z.array(z.enum(STOPPABLE_PUBLIC_EXECUTION_STATUSES)).openapi({
		description: 'Array of execution statuses to stop. Must include at least one status.',
		example: ['queued', 'running', 'waiting'],
	}),
	workflowId: z
		.string()
		.optional()
		.openapi({
			description:
				'Optional workflow ID to filter executions. If not provided, will stop executions ' +
				'across all accessible workflows. The literal value `all` has the same effect as ' +
				'omitting it.',
			example: '2tUt1wbLX592XDdX',
		}),
	// `{ offset: true }` matches the legacy `format: date-time` check exactly: it accepts `Z` and a
	// numeric offset, and rejects a value with no timezone.
	startedAfter: z.string().datetime({ offset: true }).optional().openapi({
		description: 'Only stop executions that started after this time.',
		example: '2024-01-01T00:00:00.000Z',
	}),
	startedBefore: z.string().datetime({ offset: true }).optional().openapi({
		description: 'Only stop executions that started before this time.',
		example: '2024-12-31T23:59:59.999Z',
	}),
}) {}
