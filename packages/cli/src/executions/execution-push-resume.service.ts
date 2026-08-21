import type { ResumeMessage } from '@n8n/api-types';
import { resumeMessageSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { isTerminalExecutionStatus, UnexpectedError } from 'n8n-workflow';

import { Push } from '@/push';
import { createTerminalExecutionEventMeta } from '@/push/terminal-execution-event-meta';
import type { OnPushMessage } from '@/push/types';
import { AccessService } from '@/services/access.service';

/**
 * Re-delivers terminal execution events a client missed while disconnected.
 *
 * On reconnect the client sends a `resume` message naming the executions it
 * still shows as running (see `resumeMessageSchema`). For each, the server
 * reads the durable truth — the execution row — and, if the execution has
 * already reached a terminal state, re-pushes the terminal execution event marked
 * `meta.replayed = true`. Executions still running (or unknown/pruned) get
 * nothing. A `resumeComplete` message always closes the handshake.
 *
 * This is the WebSocket producer of the "at-least-once terminal delivery"
 * guarantee; on SSE (unidirectional) recovery degrades to the REST reconcile
 * path instead. No server-side buffer, acks, or sequence counters — the DB is
 * the durability and the client dedups by executionId.
 */
@Service()
export class ExecutionPushResumeService {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly push: Push,
		private readonly executionRepository: ExecutionRepository,
		private readonly accessService: AccessService,
	) {
		this.logger = this.logger.scoped('push');
	}

	init() {
		this.push.on('message', async (event: OnPushMessage) => {
			// The push `message` channel is multiplexed across features, so ignore
			// anything that isn't a well-formed `resume` message.
			const parsed = resumeMessageSchema.safeParse(event.msg);
			if (!parsed.success) return;

			try {
				await this.handleResume(event.pushRef, event.userId, parsed.data);
			} catch (error) {
				this.errorReporter.error(
					new UnexpectedError('Error handling push resume message', {
						extra: { pushRef: event.pushRef, userId: event.userId },
						cause: error,
					}),
				);
			}
		});
	}

	private async handleResume(pushRef: string, userId: User['id'], msg: ResumeMessage) {
		const { awaiting } = msg.data;
		const replayed: string[] = [];

		if (awaiting.length > 0) {
			const executions = await this.executionRepository.findStatusByIds(awaiting);
			const executionById = new Map(executions.map((execution) => [execution.id, execution]));

			for (const executionId of awaiting) {
				const execution = executionById.get(executionId);

				// Unknown or pruned id: nothing to replay. The client falls back to a
				// full REST reconcile for anything it still shows as running.
				if (!execution) continue;

				const { workflowId, status } = execution;

				// Only replay executions the requesting user is allowed to read.
				if (!(await this.accessService.hasReadAccess(userId, workflowId))) continue;

				if (status === 'waiting') {
					// Terminal-class for the spinner (waiting → idle).
					this.push.send(
						{
							type: 'executionWaiting',
							data: { executionId },
							meta: createTerminalExecutionEventMeta({ replayed: true }),
						},
						pushRef,
					);
					replayed.push(executionId);
				} else if (isTerminalExecutionStatus(status)) {
					this.push.send(
						{
							type: 'executionFinished',
							data: { executionId, workflowId, status },
							meta: createTerminalExecutionEventMeta({ replayed: true }),
						},
						pushRef,
					);
					replayed.push(executionId);
				}
				// Otherwise still running (new/running/unknown): send nothing, live
				// events resume on their own.
			}
		}

		// Always close the handshake so the client knows catch-up is done.
		this.push.send({ type: 'resumeComplete', data: { replayed } }, pushRef);

		this.logger.debug('Handled push resume', {
			pushRef,
			awaiting: awaiting.length,
			replayed: replayed.length,
		});
	}
}
