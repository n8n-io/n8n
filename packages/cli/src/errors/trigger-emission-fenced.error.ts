import type { TriggerSeatFence } from '@n8n/db';
import { OperationalError } from 'n8n-workflow';

/**
 * A trigger emission was rejected by the seat fence: the emitting holder no
 * longer owns the seat at the epoch/version it registered with. Expected
 * during handoffs and version bumps — the node's offset/ack machinery treats
 * it as "do not commit", so a replayable source redelivers to the new holder.
 */
export class TriggerEmissionFencedError extends OperationalError {
	constructor(
		readonly workflowId: string,
		readonly nodeId: string,
		readonly fence: TriggerSeatFence,
	) {
		super('Trigger emission fenced out: the seat is no longer held at this epoch and version', {
			level: 'info',
			extra: { workflowId, nodeId, ...fence },
		});
	}
}
