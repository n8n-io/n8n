import { UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { NodeOperationError } from 'n8n-workflow';
import z from 'zod';

const intervalSchema = z.discriminatedUnion('field', [
	z.object({ field: z.literal('seconds'), secondsInterval: z.number() }),
	z.object({ field: z.literal('minutes'), minutesInterval: z.number() }),
	z.object({ field: z.literal('hours'), hoursInterval: z.number() }),
	z.object({ field: z.literal('days'), daysInterval: z.number() }),
	z.object({ field: z.literal('months'), monthsInterval: z.number() }),
]);

/** Check literal intervals with the same limits that activation uses. */
export async function validateScheduleTriggerIntervals(
	nodes: WorkflowJSON['nodes'],
): Promise<void> {
	const scheduleNodes = nodes.filter(
		(node) => node.type === 'n8n-nodes-base.scheduleTrigger' && node.typeVersion >= 1.3,
	);
	if (scheduleNodes.length === 0) return;

	const { validateInterval } = await import(
		'n8n-nodes-base/dist/nodes/Schedule/GenericFunctions.js'
	);

	for (const node of scheduleNodes) {
		const rule = node.parameters?.rule;
		if (!isRecord(rule) || !Array.isArray(rule.interval)) continue;

		for (const [index, interval] of rule.interval.entries()) {
			if (!isRecord(interval)) continue;
			const parsed = intervalSchema.safeParse({ ...interval, field: interval.field ?? 'days' });
			// Omitted values use valid defaults. Expressions are resolved at activation.
			if (!parsed.success) continue;

			try {
				validateInterval(
					{
						id: node.id,
						name: node.name ?? node.type,
						type: node.type,
						typeVersion: node.typeVersion,
						position: node.position,
						parameters: {},
					},
					index,
					parsed.data,
				);
			} catch (error) {
				if (error instanceof NodeOperationError) {
					throw new UserError(error.description ?? error.message);
				}
				throw error;
			}
		}
	}
}
