import type {
	DesktopAssistantTaskRunEvent,
	DesktopAssistantTaskRunStatus,
	InstanceAiRunFinishEvent,
	InstanceAiRunStatus,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';
import { readDesktopTaskOutcome } from '@n8n/instance-ai';
import type { Response } from 'express';

import { extractWorkflowLoopBuildOutcome } from './desktop-assistant.helpers';

import { InProcessEventBus } from '../event-bus/in-process-event-bus';
import { InstanceAiMemoryService } from '../instance-ai-memory.service';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

export type FlushableResponse = Response & { flush?: () => void };

const KEEP_ALIVE_INTERVAL_MS = 15_000;

/** Hard cap on a task-run subscription so a stalled run can't leak a listener.
 * On expiry the stream just closes — no terminal event is invented. */
const RUN_EVENTS_MAX_DURATION_MS = 15 * 60 * 1000;

/** `run-finish` payload status → the desktop client's three-value vocabulary. */
export function mapRunFinishStatus(status: InstanceAiRunStatus): DesktopAssistantTaskRunStatus {
	switch (status) {
		case 'completed':
			return 'success';
		case 'cancelled':
			return 'canceled';
		default:
			return 'error';
	}
}

/**
 * Assemble the terminal `finished` event for a task run, pure given its inputs:
 * - `status` from the run-finish payload,
 * - `tookAction` from whether any tool-call was seen for the run,
 * - `outcome` from the agent's self-reported outcome in thread metadata,
 * - `workflowId` from the workflow-loop build outcome (promote runs only —
 *   simply absent for one-shot runs).
 */
export function computeTaskRunFinishedEvent(args: {
	finishStatus: InstanceAiRunStatus;
	tookAction: boolean;
	threadMetadata: unknown;
	runId: string;
}): DesktopAssistantTaskRunEvent {
	return {
		type: 'finished',
		status: mapRunFinishStatus(args.finishStatus),
		tookAction: args.tookAction,
		outcome: readDesktopTaskOutcome(args.threadMetadata, args.runId),
		workflowId: extractWorkflowLoopBuildOutcome(args.threadMetadata, args.runId),
	};
}

/**
 * Realtime view of a single desktop task run (one-shot or promote), translated
 * from the raw Instance AI streaming protocol into the two-event vocabulary the
 * desktop client understands: `acting` (the run made its first tool call) and
 * `finished` (terminal — the server emits it and closes the stream).
 *
 * SSE mechanics mirror the instance-ai `/events/:threadId` endpoint (headers,
 * data-frame format, keep-alive pings, disconnect cleanup), minus replay
 * cursors — this stream is short-lived and carries no `id:` fields.
 */
@Service()
export class DesktopAssistantTaskRunService {
	constructor(
		private readonly logger: Logger,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly eventBus: InProcessEventBus,
	) {}

	async streamRunEvents(
		req: AuthenticatedRequest,
		res: FlushableResponse,
		{ threadId, runId }: { threadId: string; runId: string },
	): Promise<void> {
		const userId = req.user.id;

		// Same ownership semantics as promote: the thread must already exist.
		const ownership = await this.memoryService.checkThreadOwnership(userId, threadId);
		if (ownership === 'not_found') {
			throw new NotFoundError(`Thread ${threadId} not found`);
		}
		if (ownership === 'other_user') {
			throw new ForbiddenError('Not authorized for this thread');
		}

		this.openSseStream(res);
		const write = (event: DesktopAssistantTaskRunEvent) => {
			res.write(`data: ${JSON.stringify(event)}\n\n`);
			res.flush?.();
		};

		// The run may already be over (or mid-flight) — consult the stored events
		// the live SSE endpoint replays from before subscribing.
		const storedEvents = this.eventBus.getEventsForRun(threadId, runId);
		let tookAction = storedEvents.some((event) => event.type === 'tool-call');
		const storedFinish = storedEvents.find(
			(event): event is InstanceAiRunFinishEvent => event.type === 'run-finish',
		);
		if (storedFinish) {
			write(await this.computeFinished(userId, threadId, runId, storedFinish, tookAction));
			res.end();
			return;
		}

		// Run still in flight: surface `acting` once (immediately when stored
		// events already show a tool call, otherwise on the first live one), then
		// translate the run-finish into `finished` and close.
		let actingEmitted = false;
		if (tookAction) {
			actingEmitted = true;
			write({ type: 'acting' });
		}

		let finishing = false;
		let unsubscribe: () => void = () => {};
		let keepAlive: NodeJS.Timeout | undefined;
		let expiry: NodeJS.Timeout | undefined;
		const cleanup = () => {
			unsubscribe();
			if (keepAlive) clearInterval(keepAlive);
			if (expiry) clearTimeout(expiry);
		};
		const close = () => {
			cleanup();
			res.end();
		};

		unsubscribe = this.eventBus.subscribe(threadId, (stored) => {
			const event = stored.event;
			if (event.runId !== runId) return;

			if (event.type === 'tool-call') {
				tookAction = true;
				if (!actingEmitted) {
					actingEmitted = true;
					write({ type: 'acting' });
				}
				return;
			}

			if (event.type !== 'run-finish' || finishing) return;
			finishing = true;
			this.computeFinished(userId, threadId, runId, event, tookAction)
				.then(write)
				.catch((error: unknown) => {
					this.logger.warn('Failed to compute desktop task-run finished event', {
						threadId,
						runId,
						error: error instanceof Error ? error.message : String(error),
					});
				})
				.finally(close);
		});

		keepAlive = setInterval(() => {
			res.write(': ping\n\n');
			res.flush?.();
		}, KEEP_ALIVE_INTERVAL_MS);

		expiry = setTimeout(close, RUN_EVENTS_MAX_DURATION_MS);
		expiry.unref();

		req.once('close', cleanup);
		res.once('finish', cleanup);
	}

	private async computeFinished(
		userId: string,
		threadId: string,
		runId: string,
		finishEvent: InstanceAiRunFinishEvent,
		tookAction: boolean,
	): Promise<DesktopAssistantTaskRunEvent> {
		const threadMetadata = await this.memoryService.getThreadMetadata(userId, threadId);
		return computeTaskRunFinishedEvent({
			finishStatus: finishEvent.payload.status,
			tookAction,
			threadMetadata,
			runId,
		});
	}

	private openSseStream(res: FlushableResponse): void {
		// Disable response compression — SSE streams small chunks where compression
		// overhead exceeds the benefit (same rationale as the instance-ai /events
		// stream, whose header set this mirrors).
		(res as unknown as { compress: boolean }).compress = false;
		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();
	}
}
