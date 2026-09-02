import '../../openapi-extend';

import type { ExecutionStatus } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

export const STOPPABLE_PUBLIC_EXECUTION_STATUSES = ['queued', 'running', 'waiting'] as const;

export type StoppablePublicExecutionStatus = (typeof STOPPABLE_PUBLIC_EXECUTION_STATUSES)[number];

export const STOPPABLE_PUBLIC_TO_INTERNAL_STATUS = {
	queued: 'new',
	running: 'running',
	waiting: 'waiting',
} as const satisfies Record<StoppablePublicExecutionStatus, ExecutionStatus>;

export class StopManyExecutionsPublicDto extends Z.class({
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
	startedAfter: z.string().datetime({ offset: true }).optional().openapi({
		description: 'Only stop executions that started after this time.',
		example: '2024-01-01T00:00:00.000Z',
	}),
	startedBefore: z.string().datetime({ offset: true }).optional().openapi({
		description: 'Only stop executions that started before this time.',
		example: '2024-12-31T23:59:59.999Z',
	}),
}) {}
