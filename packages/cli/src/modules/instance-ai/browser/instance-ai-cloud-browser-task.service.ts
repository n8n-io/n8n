import { wrapUntrustedData } from '@n8n/agents';
import { INSTANCE_AI_CLOUD_BROWSER_AGENT_ROLE } from '@n8n/api-types';
import type { User } from '@n8n/db';
import {
	CloudBrowserTaskStorage,
	orchestratorAgentId,
	runCloudBrowserAgent,
	type BackgroundTaskManager,
	type CloudBrowserAgentBrief,
	type CloudBrowserCredentialToCreate,
	type CloudBrowserTaskInput,
	type CloudBrowserTaskRecord,
	type CloudBrowserTaskStartResult,
	type ConfirmationData,
	type InstanceAiCredentialService,
	type InstanceAiEventBus,
	type InstanceAiTraceContext,
	type Logger,
	type ModelConfig,
	type OrchestrationContext,
	type PatchableThreadMemory,
	type RunStateRegistry,
} from '@n8n/instance-ai';
import { nanoid } from 'nanoid';

import type { BrowserDomainGate } from './browser.helpers';
import type { InstanceAiCloudBrowserService } from './instance-ai-cloud-browser.service';
import type { SuspendedThreadPersistenceService } from '../suspended-thread-persistence.service';
import {
	AUTO_FOLLOW_UP_MESSAGE,
	CLOUD_BROWSER_TASK_COMPLETED_CLOSE_TAG,
	CLOUD_BROWSER_TASK_COMPLETED_OPEN_TAG,
} from '../internal-messages';

export interface InstanceAiCloudBrowserTaskServiceOptions {
	logger: Logger;
	eventBus: InstanceAiEventBus;
	backgroundTaskManager: BackgroundTaskManager;
	cloudBrowserService: InstanceAiCloudBrowserService;
	/** Keeps the thread's task records, so a result that ends mid-run waits for the next run. */
	agentMemory: PatchableThreadMemory;
	/** Holds a card's resolver until the answer endpoint resolves it. */
	runState: Pick<
		RunStateRegistry<User>,
		'registerPendingConfirmation' | 'rejectPendingConfirmation'
	>;
	/** Persists a card, so it expires and fails clearly after a restart. */
	suspendedThreads: Pick<
		SuspendedThreadPersistenceService,
		'persistPendingConfirmation' | 'dropPendingConfirmation'
	>;
	/**
	 * Starts an internal follow-up run on the thread. Resolves to an empty string when no run
	 * could start, for example while another run is live.
	 */
	startFollowUpRun: (
		user: User,
		threadId: string,
		message: string,
		messageGroupId?: string,
	) => Promise<string>;
}

/** The orchestrator run that starts a task. */
export interface CloudBrowserRunOptions {
	runId: string;
	user: User;
	threadId: string;
	messageGroupId?: string;
	modelId: ModelConfig;
	modelStreamStallOptions?: OrchestrationContext['modelStreamStallOptions'];
	tracing?: InstanceAiTraceContext;
	/** The run's site approvals and permissions. */
	domainGate: BrowserDomainGate;
	/**
	 * The run's credential type lookup, for the credentials the task creates. Empty for an
	 * unknown type. Absent when the host cannot look up credential types.
	 */
	getCredentialFields?: InstanceAiCredentialService['getCredentialFields'];
}

/**
 * Runs cloud browser tasks as background tasks. Each task gets its own cloud browser server,
 * released when the task ends, however it ends. Each task also has a record in the thread's
 * metadata, which carries its result to the orchestrator once no run is live.
 */
export class InstanceAiCloudBrowserTaskService {
	private readonly taskStore: CloudBrowserTaskStorage;

	constructor(private readonly options: InstanceAiCloudBrowserTaskServiceOptions) {
		this.taskStore = new CloudBrowserTaskStorage(options.agentMemory);
	}

	async startTask(
		input: CloudBrowserTaskInput,
		run: CloudBrowserRunOptions,
	): Promise<CloudBrowserTaskStartResult> {
		const { eventBus, backgroundTaskManager } = this.options;
		const { user, runId, threadId } = run;

		const credentialsToCreate: CloudBrowserCredentialToCreate[] = [];
		if (input.credentialsToCreate?.length) {
			const { getCredentialFields } = run;
			if (!getCredentialFields) {
				return {
					status: 'rejected',
					message: 'Creating credentials from the cloud browser is not available.',
				};
			}
			for (const { type, name } of input.credentialsToCreate) {
				const fields = await getCredentialFields(type);
				if (fields.length === 0) {
					return {
						status: 'rejected',
						message: `There is no credential type "${type}". Find the type with workflow_builder_credentials(action="search-types").`,
					};
				}
				credentialsToCreate.push({ type, name, fields });
			}
		}
		const brief: CloudBrowserAgentBrief = {
			goal: input.goal,
			startUrl: input.startUrl,
			...(credentialsToCreate.length > 0 ? { credentialsToCreate } : {}),
		};

		const taskId = `task_${nanoid()}`;
		const agentId = `agent_${nanoid()}`;

		await this.taskStore.add(threadId, {
			taskId,
			agentId,
			runId,
			messageGroupId: run.messageGroupId,
			title: input.title,
			status: 'running',
			startedAt: new Date().toISOString(),
		});

		let spawned: ReturnType<BackgroundTaskManager['spawn']>;
		try {
			spawned = backgroundTaskManager.spawn({
				taskId,
				threadId,
				runId,
				role: INSTANCE_AI_CLOUD_BROWSER_AGENT_ROLE,
				agentId,
				messageGroupId: run.messageGroupId,
				run: async (signal) => await this.runTask(signal, { taskId, agentId }, brief, run),
				// The card in the sidebar closes with the task.
				onCompleted: (task) => {
					eventBus.publish(threadId, {
						type: 'agent-completed',
						runId,
						agentId,
						payload: { role: task.role, result: task.result ?? '', status: 'completed' },
					});
				},
				onFailed: (task) => {
					eventBus.publish(threadId, {
						type: 'agent-completed',
						runId,
						agentId,
						payload: {
							role: task.role,
							result: '',
							error: task.error ?? 'Unknown error',
							status: 'error',
						},
					});
				},
				onSettled: async () => {
					await this.deliverPendingResults(user, threadId);
				},
			});
		} catch (error) {
			await this.taskStore.remove(threadId, taskId);
			throw error;
		}

		if (spawned.status !== 'started') {
			await this.taskStore.remove(threadId, taskId);
			return {
				status: 'rejected',
				message:
					spawned.status === 'limit-reached'
						? 'Too many background tasks are running in this conversation. Wait for one to finish.'
						: 'This browser task is already running.',
			};
		}

		eventBus.publish(threadId, {
			type: 'agent-spawned',
			runId,
			agentId,
			payload: {
				parentId: orchestratorAgentId(runId),
				role: INSTANCE_AI_CLOUD_BROWSER_AGENT_ROLE,
				tools: [],
				taskId,
				title: input.title,
				goal: input.goal,
				// The chat shows only that the task started and ended. Its approval cards still show,
				// and the result reaches the user through the orchestrator's follow-up.
				hideSteps: true,
			},
		});
		return { status: 'started', taskId };
	}

	/**
	 * The task's background work: its own browser server, the agent, and the record of how it
	 * ended. The server is released when the agent ends, however it ends.
	 */
	private async runTask(
		signal: AbortSignal,
		task: { taskId: string; agentId: string },
		brief: CloudBrowserAgentBrief,
		run: CloudBrowserRunOptions,
	): Promise<{ text: string; outcome: { outcome: string } }> {
		const { cloudBrowserService, eventBus, backgroundTaskManager, logger } = this.options;
		const { taskId, agentId } = task;
		const { user, runId, threadId } = run;
		const confirmationCards = new Set<string>();

		try {
			const mcpServer = await cloudBrowserService.createServer(
				user.id,
				threadId,
				taskId,
				run.domainGate,
			);
			try {
				const result = await runCloudBrowserAgent({
					agentId,
					brief,
					mcpServer,
					modelId: run.modelId,
					threadId,
					runId,
					eventBus,
					logger,
					abortSignal: signal,
					waitForConfirmation: async (requestId) =>
						await this.waitForAnswer(requestId, run, confirmationCards),
					onActivity: () => backgroundTaskManager.touchTask(threadId, taskId),
					streamOptions: run.modelStreamStallOptions,
					tracing: run.tracing,
				});
				await this.taskStore.markFinished(threadId, taskId, result);
				return { text: result.summary, outcome: { outcome: result.outcome } };
			} finally {
				await cloudBrowserService.release(taskId);
				// A task that ends with a card open, stopped or failed, must not leave it answerable.
				for (const requestId of confirmationCards) await this.closeConfirmationCard(requestId);
			}
		} catch (error) {
			await this.taskStore.markFinished(threadId, taskId, {
				outcome: 'failed',
				summary: `The browser task failed: ${error instanceof Error ? error.message : String(error)}`,
			});
			throw error;
		}
	}

	/**
	 * Waits for the user to answer a card the agent raised. The card event is already on the
	 * stream; this registers the answer's destination, so `POST /confirm/:requestId` resolves it.
	 */
	private async waitForAnswer(
		requestId: string,
		run: CloudBrowserRunOptions,
		openCards: Set<string>,
	): Promise<ConfirmationData> {
		const { threadId, user } = run;
		openCards.add(requestId);
		const answer = new Promise<ConfirmationData>((resolve) => {
			this.options.runState.registerPendingConfirmation(requestId, {
				resolve,
				threadId,
				userId: user.id,
				createdAt: Date.now(),
			});
		});
		await this.options.suspendedThreads.persistPendingConfirmation({
			requestId,
			threadId,
			userId: user.id,
			runId: run.runId,
			messageGroupId: run.messageGroupId,
			kind: 'inline',
		});
		try {
			return await answer;
		} finally {
			openCards.delete(requestId);
		}
	}

	/** Rejects a card that no agent waits for any more, and drops its row. */
	private async closeConfirmationCard(requestId: string): Promise<void> {
		this.options.runState.rejectPendingConfirmation(requestId);
		await this.options.suspendedThreads.dropPendingConfirmation(requestId);
	}

	/**
	 * Starts one follow-up run with every finished task the orchestrator has not heard about.
	 * Called when a task ends and when a run ends, so a result that arrives mid-run reaches the
	 * orchestrator as soon as that run is over. The claim is released when no run could start.
	 */
	async deliverPendingResults(user: User, threadId: string): Promise<void> {
		const undelivered = await this.taskStore.claimUndelivered(threadId);
		if (undelivered.length === 0) return;

		// Return the result as a new turn, not the turn that started the task
		// since the user may have moved on.
		const runId = await this.options.startFollowUpRun(
			user,
			threadId,
			buildTasksCompletedMessage(undelivered),
		);
		if (!runId) {
			await this.taskStore.releaseClaim(
				threadId,
				undelivered.map((task) => task.taskId),
			);
		}
	}
}

/**
 * The follow-up message that tells the orchestrator how its tasks ended. The UI never shows it:
 * `internal-messages.ts` strips the block, and the trailing follow-up marker hides the rest.
 * Each summary is the agent's own report, which can repeat content from the pages it visited,
 * so it is wrapped as untrusted data.
 */
function buildTasksCompletedMessage(tasks: CloudBrowserTaskRecord[]): string {
	const entries = tasks.flatMap((task) => {
		// Quote the title, and drop tag characters so it cannot close the surrounding tag.
		const title = JSON.stringify(task.title.replace(/[<>]/g, ''));
		return [
			`<task taskId="${task.taskId}" title=${title} outcome="${task.outcome ?? 'failed'}">`,
			wrapUntrustedData(task.summary ?? '', INSTANCE_AI_CLOUD_BROWSER_AGENT_ROLE),
			'</task>',
		];
	});
	return [
		CLOUD_BROWSER_TASK_COMPLETED_OPEN_TAG,
		'Cloud browser tasks that ended. This is an automated report, not a message from the user. ' +
			'Tell the user what each task found, or why it did not finish, in a few sentences.',
		...entries,
		CLOUD_BROWSER_TASK_COMPLETED_CLOSE_TAG,
		'',
		AUTO_FOLLOW_UP_MESSAGE,
	].join('\n');
}
