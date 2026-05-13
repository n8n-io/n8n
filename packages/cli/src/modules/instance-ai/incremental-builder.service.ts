/**
 * Incremental Builder Service — hackathon path.
 *
 * Owns the per-thread HitlBroker registry, kicks off the orchestrator on
 * `startRun`, and resolves user replies on `resolveConfirmation`.
 *
 * Independent of InstanceAiService so we can iterate fast without disturbing
 * the existing Mastra-backed path.
 */

import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	InstanceAiCredentialService,
	InstanceAiExecutionService,
	InstanceAiNodeService,
	InstanceAiWorkflowService,
} from '@n8n/instance-ai';
import { HitlBroker, runIncrementalOrchestrator } from '@n8n/instance-ai';
import { nanoid } from 'nanoid';

import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { InstanceAiAdapterService } from './instance-ai.adapter.service';
import { InstanceAiService } from './instance-ai.service';

interface ActiveIncrementalRun {
	runId: string;
	threadId: string;
	broker: HitlBroker;
	startedAt: number;
}

@Service()
export class IncrementalBuilderService {
	private readonly logger: Logger;

	private readonly activeByThread = new Map<string, ActiveIncrementalRun>();

	constructor(
		logger: Logger,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly instanceAiService: InstanceAiService,
		private readonly eventBus: InProcessEventBus,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	isActive(threadId: string): boolean {
		return this.activeByThread.has(threadId);
	}

	/**
	 * Linear scan for the thread that owns a given requestId. We expect at most
	 * a handful of active threads, so a per-request index isn't worth it.
	 * Returns undefined when no broker owns the request.
	 */
	findThreadForRequestId(requestId: string): string | undefined {
		for (const [threadId, active] of this.activeByThread.entries()) {
			if (active.broker.hasPending(requestId)) return threadId;
		}
		return undefined;
	}

	async startRun(user: User, threadId: string, message: string): Promise<string> {
		if (this.activeByThread.has(threadId)) {
			throw new Error('An incremental run is already active for this thread');
		}

		const runId = `inc_run_${nanoid(10)}`;
		const agentId = `inc_agent_${nanoid(8)}`;

		const broker = new HitlBroker({
			threadId,
			runId,
			agentId,
			userId: user.id,
			eventBus: this.eventBus,
		});

		this.activeByThread.set(threadId, {
			runId,
			threadId,
			broker,
			startedAt: Date.now(),
		});

		const modelConfig = await this.instanceAiService.resolveAgentModelConfig(user);
		const modelString =
			typeof modelConfig === 'string' ? modelConfig : 'anthropic/claude-sonnet-4-5';

		const context = this.adapterService.createContext(user, { threadId });

		// Fire `run-start` so the SSE consumer treats this as a real run.
		this.eventBus.publish(threadId, {
			type: 'run-start',
			runId: runId as never,
			agentId: agentId as never,
			userId: user.id,
			payload: { messageId: nanoid() },
		});

		// Background: drive the orchestrator. Errors are surfaced as `error`
		// events and the run is cleaned up.
		void this.runOrchestrator({
			user,
			threadId,
			runId,
			agentId,
			broker,
			modelString,
			workflow: context.workflowService as InstanceAiWorkflowService,
			node: context.nodeService as InstanceAiNodeService,
			execution: context.executionService as InstanceAiExecutionService,
			credential: context.credentialService as InstanceAiCredentialService,
			message,
		}).catch((error: unknown) => {
			const errMessage = error instanceof Error ? error.message : String(error);
			this.logger.error('Incremental orchestrator failed', { error: errMessage });
			this.eventBus.publish(threadId, {
				type: 'error',
				runId: runId as never,
				agentId: agentId as never,
				userId: user.id,
				payload: { content: errMessage },
			});
		});

		return runId;
	}

	private async runOrchestrator(opts: {
		user: User;
		threadId: string;
		runId: string;
		agentId: string;
		broker: HitlBroker;
		modelString: string;
		workflow: InstanceAiWorkflowService;
		node: InstanceAiNodeService;
		execution: InstanceAiExecutionService;
		credential: InstanceAiCredentialService;
		message: string;
	}): Promise<void> {
		try {
			const result = await runIncrementalOrchestrator({
				threadId: opts.threadId,
				runId: opts.runId,
				agentId: opts.agentId,
				userId: opts.user.id,
				model: opts.modelString,
				fastModel: opts.modelString,
				services: {
					workflow: opts.workflow,
					node: opts.node,
					execution: opts.execution,
					credential: opts.credential,
				},
				eventBus: this.eventBus,
				checkpointThreadKey: opts.threadId,
				userMessage: opts.message,
				broker: opts.broker,
			});

			this.eventBus.publish(opts.threadId, {
				type: 'run-finish',
				runId: opts.runId as never,
				agentId: opts.agentId as never,
				userId: opts.user.id,
				payload: {
					status: result.verifierVerdict === 'verified' ? 'completed' : 'completed',
					...(result.verifierSummary !== undefined && { reason: result.verifierSummary }),
				},
			});
		} finally {
			this.cleanupRun(opts.threadId);
		}
	}

	/**
	 * Resolve a user-confirmation reply against the broker that issued the
	 * request. Returns true when a broker handled it, false when no incremental
	 * run owns this requestId — letting the caller fall back to the legacy
	 * resolver.
	 *
	 * Accepts the parsed `questions`-kind confirmation shape from the controller:
	 *   { requestId, selectedLabel?, freeText?, cancelled? }
	 */
	resolveConfirmation(
		threadId: string,
		response: {
			requestId: string;
			selectedLabel?: string;
			freeText?: string;
			cancelled?: boolean;
		},
	): boolean {
		const active = this.activeByThread.get(threadId);
		if (!active) return false;
		return active.broker.resolve(response.requestId, {
			...(response.selectedLabel !== undefined && { selectedLabel: response.selectedLabel }),
			...(response.freeText !== undefined && { freeText: response.freeText }),
			...(response.cancelled !== undefined && { cancelled: response.cancelled }),
		});
	}

	cancel(threadId: string): boolean {
		const active = this.activeByThread.get(threadId);
		if (!active) return false;
		active.broker.cancelAll();
		this.cleanupRun(threadId);
		return true;
	}

	private cleanupRun(threadId: string): void {
		const active = this.activeByThread.get(threadId);
		if (!active) return;
		this.activeByThread.delete(threadId);
	}
}
