import type { Logger } from '@n8n/backend-common';
import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';
import {
	createMemory,
	type ManagedBackgroundTask,
	TerminalOutcomeStorage,
	type TerminalOutcome,
} from '@n8n/instance-ai';

import type { Telemetry } from '@/telemetry';
import type { DbSnapshotStorage } from '../storage/db-snapshot-storage';

type TerminalOutcomeStore = Pick<
	TerminalOutcomeStorage,
	'getUndelivered' | 'markDelivered' | 'upsert'
>;

type TerminalOutcomeSnapshotStorage = Pick<DbSnapshotStorage, 'getLatest' | 'save' | 'updateLast'>;

type TerminalOutcomeEventBus = {
	getEventsForRun: (threadId: string, runId: string) => InstanceAiEvent[];
	publish: (threadId: string, event: InstanceAiEvent) => void;
};

type TerminalOutcomeTelemetry = Pick<Telemetry, 'track'>;

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function getBackgroundOutcomeResponseId(outcome: TerminalOutcome): string {
	return `background-outcome:${outcome.id}`;
}

function createTerminalOutcomeAgentTree(
	outcome: TerminalOutcome,
	responseId: string,
	orchestratorAgentId: string,
): InstanceAiAgentNode {
	return {
		agentId: orchestratorAgentId,
		role: 'orchestrator',
		status:
			outcome.status === 'cancelled'
				? 'cancelled'
				: outcome.status === 'failed'
					? 'error'
					: 'completed',
		textContent: outcome.userFacingMessage,
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [{ type: 'text', content: outcome.userFacingMessage, responseId }],
	};
}

function appendTerminalOutcomeToAgentTree(
	tree: InstanceAiAgentNode,
	outcome: TerminalOutcome,
	responseId: string,
): { tree: InstanceAiAgentNode; appended: boolean } {
	const text = outcome.userFacingMessage.trim();
	if (!text) return { tree, appended: false };

	const alreadyInTimeline = tree.timeline.some(
		(entry) => entry.type === 'text' && entry.responseId === responseId,
	);
	if (alreadyInTimeline) {
		return { tree, appended: false };
	}

	return {
		appended: true,
		tree: {
			...tree,
			textContent: tree.textContent ? `${tree.textContent}\n\n${outcome.userFacingMessage}` : text,
			timeline: [
				...tree.timeline,
				{ type: 'text', content: outcome.userFacingMessage, responseId },
			],
		},
	};
}

export class InstanceAiTerminalOutcomeService {
	private readonly pendingTerminalOutcomes = new Map<string, TerminalOutcome>();

	private terminalOutcomeStorage?: TerminalOutcomeStore;

	constructor(
		private readonly deps: {
			orchestratorAgentId: string;
			dbSnapshotStorage: TerminalOutcomeSnapshotStorage;
			eventBus: TerminalOutcomeEventBus;
			telemetry: TerminalOutcomeTelemetry;
			logger: Pick<Logger, 'warn'>;
			createMemoryConfig: () => Parameters<typeof createMemory>[0];
			createStorage?: () => TerminalOutcomeStore;
		},
	) {}

	async replayUndeliveredTerminalOutcomes(
		threadId: string,
		options: { delivery?: 'snapshot' | 'event' } = {},
	): Promise<void> {
		const storage = this.createTerminalOutcomeStorage();
		const persistedOutcomes = await storage.getUndelivered(threadId).catch((error) => {
			this.deps.logger.warn('Failed to load undelivered Instance AI terminal outcomes', {
				threadId,
				error: getErrorMessage(error),
			});
			return [] as TerminalOutcome[];
		});
		const inMemoryOutcomes = [...this.pendingTerminalOutcomes.values()].filter(
			(outcome) => outcome.threadId === threadId,
		);
		const outcomes = new Map<string, TerminalOutcome>();
		for (const outcome of [...persistedOutcomes, ...inMemoryOutcomes]) {
			outcomes.set(outcome.id, outcome);
		}
		const persistedOutcomeIds = new Set(persistedOutcomes.map((outcome) => outcome.id));
		const delivery = options.delivery ?? 'snapshot';

		for (const outcome of outcomes.values()) {
			const responseId = getBackgroundOutcomeResponseId(outcome);
			let snapshotDelivered = false;
			try {
				snapshotDelivered = await this.persistTerminalOutcomeLineToSnapshot(outcome, responseId);
			} catch (error) {
				this.deps.logger.warn('Failed to replay Instance AI terminal outcome', {
					threadId,
					runId: outcome.runId,
					taskId: outcome.taskId,
					error: getErrorMessage(error),
				});
				if (delivery === 'event') {
					const published = this.publishTerminalOutcomeLine(outcome, responseId);
					this.deps.telemetry.track('instance_ai_terminal_response_decision', {
						thread_id: threadId,
						run_id: outcome.runId,
						message_group_id: outcome.messageGroupId,
						task_id: outcome.taskId,
						source: 'terminal_outcome_replay',
						status: outcome.status,
						action: published ? 'replay_event' : 'already-emitted',
						visibility_source: 'background-outcome',
					});
				}
				continue;
			}

			if (!snapshotDelivered) continue;

			let action = 'replay_snapshot';
			if (delivery === 'event') {
				const published = this.publishTerminalOutcomeLine(outcome, responseId);
				action = published ? 'replay_event' : 'already-emitted';
			}

			if (persistedOutcomeIds.has(outcome.id)) {
				await storage
					.markDelivered(threadId, outcome.id, new Date().toISOString())
					.catch((error) => {
						this.deps.logger.warn('Failed to mark Instance AI terminal outcome as delivered', {
							threadId,
							runId: outcome.runId,
							taskId: outcome.taskId,
							error: getErrorMessage(error),
						});
					});
			}
			this.pendingTerminalOutcomes.delete(outcome.id);
			this.deps.telemetry.track('instance_ai_terminal_response_decision', {
				thread_id: threadId,
				run_id: outcome.runId,
				message_group_id: outcome.messageGroupId,
				task_id: outcome.taskId,
				source: 'terminal_outcome_replay',
				status: outcome.status,
				action,
				visibility_source: 'background-outcome',
			});
		}
	}

	async recordBackgroundTerminalOutcome(task: ManagedBackgroundTask): Promise<void> {
		const outcome = this.buildBackgroundTerminalOutcome(task);
		let persisted = false;
		try {
			await this.createTerminalOutcomeStorage().upsert(task.threadId, outcome);
			persisted = true;
		} catch (error) {
			this.pendingTerminalOutcomes.set(outcome.id, outcome);
			this.deps.logger.warn('Failed to persist Instance AI terminal outcome', {
				threadId: task.threadId,
				runId: task.runId,
				taskId: task.taskId,
				error: getErrorMessage(error),
			});
			this.deps.telemetry.track('instance_ai_terminal_outcome_persistence_failure', {
				thread_id: task.threadId,
				run_id: task.runId,
				task_id: task.taskId,
				status: outcome.status,
				phase: 'metadata',
			});
		}

		const responseId = getBackgroundOutcomeResponseId(outcome);
		const published = this.publishTerminalOutcomeLine(outcome, responseId);

		this.deps.telemetry.track('instance_ai_terminal_response_decision', {
			thread_id: task.threadId,
			run_id: task.runId,
			message_group_id: task.messageGroupId,
			task_id: task.taskId,
			source: 'background_outcome',
			status: outcome.status,
			action: published ? 'emit' : 'already-emitted',
			visibility_source: 'background-outcome',
		});

		let snapshotDelivered = false;
		try {
			snapshotDelivered = await this.persistTerminalOutcomeLineToSnapshot(outcome, responseId);
		} catch (error) {
			this.deps.logger.warn('Failed to persist Instance AI terminal outcome line to snapshot', {
				threadId: task.threadId,
				runId: task.runId,
				taskId: task.taskId,
				error: getErrorMessage(error),
			});
			this.deps.telemetry.track('instance_ai_terminal_outcome_persistence_failure', {
				thread_id: task.threadId,
				run_id: task.runId,
				task_id: task.taskId,
				status: outcome.status,
				phase: 'snapshot',
			});
		}

		if (!persisted || !snapshotDelivered) return;

		try {
			await this.createTerminalOutcomeStorage().markDelivered(
				task.threadId,
				outcome.id,
				new Date().toISOString(),
			);
			this.pendingTerminalOutcomes.delete(outcome.id);
		} catch (error) {
			this.deps.logger.warn('Failed to mark Instance AI terminal outcome as delivered', {
				threadId: task.threadId,
				runId: task.runId,
				taskId: task.taskId,
				error: getErrorMessage(error),
			});
		}
	}

	clearThread(threadId: string): void {
		for (const [id, outcome] of this.pendingTerminalOutcomes) {
			if (outcome.threadId === threadId) {
				this.pendingTerminalOutcomes.delete(id);
			}
		}
	}

	private createTerminalOutcomeStorage(): TerminalOutcomeStore {
		if (this.deps.createStorage) return this.deps.createStorage();

		this.terminalOutcomeStorage ??= new TerminalOutcomeStorage(
			createMemory(this.deps.createMemoryConfig()),
		);
		return this.terminalOutcomeStorage;
	}

	private async persistTerminalOutcomeLineToSnapshot(
		outcome: TerminalOutcome,
		responseId: string,
	): Promise<boolean> {
		const snapshot = await this.deps.dbSnapshotStorage.getLatest(outcome.threadId, {
			messageGroupId: outcome.messageGroupId,
			runId: outcome.runId,
		});
		if (!snapshot) {
			await this.deps.dbSnapshotStorage.save(
				outcome.threadId,
				createTerminalOutcomeAgentTree(outcome, responseId, this.deps.orchestratorAgentId),
				outcome.runId,
				{
					messageGroupId: outcome.messageGroupId,
					runIds: [outcome.runId],
				},
			);
			return true;
		}

		const { tree } = appendTerminalOutcomeToAgentTree(snapshot.tree, outcome, responseId);
		const runIds = new Set(snapshot.runIds ?? [snapshot.runId]);
		runIds.add(outcome.runId);
		await this.deps.dbSnapshotStorage.updateLast(outcome.threadId, tree, snapshot.runId, {
			messageGroupId: snapshot.messageGroupId ?? outcome.messageGroupId,
			runIds: [...runIds],
			langsmithRunId: snapshot.langsmithRunId,
			langsmithTraceId: snapshot.langsmithTraceId,
		});
		return true;
	}

	private publishTerminalOutcomeLine(outcome: TerminalOutcome, responseId: string): boolean {
		const alreadyPublished = this.deps.eventBus
			.getEventsForRun(outcome.threadId, outcome.runId)
			.some((event) => event.responseId === responseId);
		if (alreadyPublished) return false;

		this.deps.eventBus.publish(outcome.threadId, {
			type: 'text-delta',
			runId: outcome.runId,
			agentId: this.deps.orchestratorAgentId,
			responseId,
			payload: { text: outcome.userFacingMessage },
		});
		return true;
	}

	private buildBackgroundTerminalOutcome(task: ManagedBackgroundTask): TerminalOutcome {
		const status =
			task.status === 'failed' ? 'failed' : task.status === 'cancelled' ? 'cancelled' : 'completed';
		const userFacingMessage =
			status === 'completed'
				? `The background ${task.role} task finished.`
				: status === 'cancelled'
					? `The background ${task.role} task was cancelled.`
					: `The background ${task.role} task failed before I could complete that part.`;

		return {
			id: `${task.messageGroupId ?? task.runId}:${task.taskId}:${status}`,
			threadId: task.threadId,
			runId: task.runId,
			messageGroupId: task.messageGroupId,
			correlationId: task.messageGroupId,
			taskId: task.taskId,
			agentId: task.agentId,
			status,
			userFacingMessage,
			createdAt: new Date().toISOString(),
		};
	}
}
