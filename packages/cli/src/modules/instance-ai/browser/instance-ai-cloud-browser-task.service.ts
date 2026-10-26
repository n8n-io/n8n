import { wrapUntrustedData, type ExecutionOptions } from '@n8n/agents';
import type { User } from '@n8n/db';
import {
	CloudBrowserTaskStorage,
	createInstanceAiTraceContext,
	orchestratorAgentId,
	runCloudBrowserAgent,
	type BackgroundTaskManager,
	type CloudBrowserAgentBrief,
	type CloudBrowserAgentResult,
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
	type ServiceProxyConfig,
} from '@n8n/instance-ai';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { nanoid } from 'nanoid';

import { N8N_VERSION, WORKFLOW_SDK_VERSION } from '@/constants';

import type { BrowserDomainGate } from './browser.helpers';
import type { InstanceAiCloudBrowserService } from './instance-ai-cloud-browser.service';
import type { InstanceAiCreditService } from '../instance-ai-credit.service';
import type { SuspendedThreadPersistenceService } from '../suspended-thread-persistence.service';
import type { InstanceAiTracingService } from '../tracing/instance-ai-tracing.service';
import {
	AUTO_FOLLOW_UP_MESSAGE,
	CLOUD_BROWSER_TASK_COMPLETED_CLOSE_TAG,
	CLOUD_BROWSER_TASK_COMPLETED_OPEN_TAG,
	sanitisePromptText,
} from '../internal-messages';

/** Same role as the cloud browser agent's. It names the task's events and its untrusted result. */
const CLOUD_BROWSER_AGENT_ROLE = 'cloud-browser';

/**
 * Longest task summary the orchestrator gets. The agent writes a few sentences, so this only cuts
 * a report that repeats too much page content.
 */
const TASK_SUMMARY_MAX_LENGTH = 4000;

/** How often the main that runs a task records that it is still alive. */
export const TASK_ALIVE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * A running task whose main has not recorded that it is alive for this long has stopped, for
 * example because n8n restarted. It is three intervals, so one missed update does not fail a task.
 */
export const TASK_STALE_AFTER_MS = 3 * TASK_ALIVE_INTERVAL_MS;

const TASK_STOPPED_SUMMARY = 'The browser task stopped because n8n restarted.';

export interface InstanceAiCloudBrowserTaskServiceOptions {
	logger: Logger;
	eventBus: InstanceAiEventBus;
	backgroundTaskManager: BackgroundTaskManager;
	cloudBrowserService: InstanceAiCloudBrowserService;
	/** Charges the agent's model usage to the user's AI Assistant credits. */
	creditService: Pick<InstanceAiCreditService, 'claimRunUsage'>;
	/** Closes the task's trace when the task ends. */
	tracing: Pick<InstanceAiTracingService, 'finalizeBackgroundTaskTracing'>;
	/** Where the task's trace is sent: through the AI service proxy, or nowhere when unset. */
	resolveTracingProxyConfig: (user: Pick<User, 'id'>) => Promise<ServiceProxyConfig | undefined>;
	/** Step hooks that show the task in the run debug panel. Unset while run debug is off. */
	createRunDebugStepHooks?: (task: {
		taskId: string;
		threadId: string;
		title: string;
	}) => Pick<ExecutionOptions, 'onStepStart' | 'onStepEnd'> | undefined;
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
	 * Starts an internal follow-up run on the thread, in the given message group. Resolves to
	 * an empty string when no run could start, for example while another run is live.
	 */
	startFollowUpRun: (
		user: User,
		threadId: string,
		message: string,
		messageGroupId: string,
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
	/** The run's trace. The task's own trace links back to it. */
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
		runOptions: CloudBrowserRunOptions,
	): Promise<CloudBrowserTaskStartResult> {
		const { eventBus, backgroundTaskManager } = this.options;
		const { user, runId, threadId } = runOptions;

		const credentialsToCreate: CloudBrowserCredentialToCreate[] = [];
		if (input.credentialsToCreate?.length) {
			const { getCredentialFields } = runOptions;
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
			messageGroupId: runOptions.messageGroupId,
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
				role: CLOUD_BROWSER_AGENT_ROLE,
				agentId,
				messageGroupId: runOptions.messageGroupId,
				// The user keeps chatting while the task runs.
				detachedFromTurn: true,
				// The task's own trace, so it outlives the run that started it. The manager
				// creates it when the task starts and the cancel paths close it.
				createTraceContext: async () =>
					await this.createTaskTrace({ taskId, agentId, title: input.title }, brief, runOptions),
				run: async (signal, _drainCorrections, _waitForCorrection, { traceContext }) =>
					await this.runTask(
						signal,
						{ taskId, agentId, title: input.title, tracing: traceContext },
						brief,
						runOptions,
					),
				// The card in the sidebar closes with the task.
				onCompleted: async (task) => {
					await this.options.tracing.finalizeBackgroundTaskTracing(task, 'completed');
					eventBus.publish(threadId, {
						type: 'agent-completed',
						runId,
						agentId,
						detachedFromTurn: true,
						payload: { role: task.role, result: task.result ?? '', status: 'completed' },
					});
				},
				onFailed: async (task) => {
					await this.options.tracing.finalizeBackgroundTaskTracing(task, 'failed');
					eventBus.publish(threadId, {
						type: 'agent-completed',
						runId,
						agentId,
						detachedFromTurn: true,
						payload: {
							role: task.role,
							result: '',
							error: task.error ?? 'Unknown error',
							status: 'error',
						},
					});
				},
				// The task manager does not wait for this callback, so a failed delivery is logged here.
				onSettled: async () => {
					await this.deliverPendingResults(user, threadId).catch((error: unknown) => {
						this.options.logger.error('Failed to deliver the cloud browser task results', {
							threadId,
							taskId,
							error: error instanceof Error ? error.message : String(error),
						});
					});
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
			detachedFromTurn: true,
			payload: {
				parentId: orchestratorAgentId(runId),
				role: CLOUD_BROWSER_AGENT_ROLE,
				tools: [],
				taskId,
				title: input.title,
				goal: input.goal,
				kind: 'cloud-browser',
			},
		});
		return { status: 'started', taskId };
	}

	/**
	 * Charges the agent's usage once. The agent resumes in this process after each card, so its
	 * usage covers the whole task, also when the task is stopped. Billing never fails the task.
	 */
	private async claimUsage(
		run: CloudBrowserRunOptions,
		taskId: string,
		result: Pick<CloudBrowserAgentResult, 'agentRunId' | 'usage' | 'status'>,
	): Promise<void> {
		try {
			await this.options.creditService.claimRunUsage(
				run.user,
				run.threadId,
				result.agentRunId || taskId,
				result.usage,
				result.status,
			);
		} catch (error) {
			this.options.logger.error('Failed to charge the cloud browser task usage', {
				threadId: run.threadId,
				taskId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * The task's background work: its own browser server, the agent, and the record of how it
	 * ended. The server is released when the agent ends, however it ends.
	 */
	private async runTask(
		signal: AbortSignal,
		task: { taskId: string; agentId: string; title: string; tracing?: InstanceAiTraceContext },
		brief: CloudBrowserAgentBrief,
		run: CloudBrowserRunOptions,
	): Promise<{ text: string; outcome: { outcome: string } }> {
		const { cloudBrowserService, eventBus, backgroundTaskManager, logger } = this.options;
		const { taskId, agentId } = task;
		const { user, runId, threadId } = run;
		const confirmationCards = new Set<string>();
		// Any main can fail a task that stops being marked alive, so this one keeps marking it. A timer,
		// not agent activity, because a task can wait hours for an approval without doing anything.
		const aliveTimer = setInterval(() => {
			this.taskStore.markAlive(threadId, taskId).catch((error: unknown) => {
				logger.warn('Failed to mark a cloud browser task alive', {
					taskId,
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}, TASK_ALIVE_INTERVAL_MS);
		aliveTimer.unref();

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
						await this.waitForAnswer(requestId, taskId, run, confirmationCards),
					onActivity: () => backgroundTaskManager.touchTask(threadId, taskId),
					streamOptions: {
						...run.modelStreamStallOptions,
						...this.options.createRunDebugStepHooks?.({ taskId, threadId, title: task.title }),
					},
					tracing: task.tracing,
				});
				await this.claimUsage(run, taskId, result);
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
		} finally {
			clearInterval(aliveTimer);
			// The task manager does not settle a stopped task, so its result is delivered here.
			if (signal.aborted) {
				await this.deliverPendingResults(user, threadId).catch((error: unknown) => {
					logger.warn('Failed to deliver a stopped cloud browser task', {
						taskId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
			}
		}
	}

	/**
	 * The task's own trace: a root run for the task and an actor run for the agent, like a turn's.
	 * The orchestrator's trace cannot hold it, because that trace closes with the turn while the
	 * task runs on, for hours when it waits for an approval. The metadata links the two. Tracing
	 * never fails a task: without a trace the task runs untraced.
	 */
	private async createTaskTrace(
		task: { taskId: string; agentId: string; title: string },
		brief: CloudBrowserAgentBrief,
		run: CloudBrowserRunOptions,
	): Promise<InstanceAiTraceContext | undefined> {
		const { taskId, agentId } = task;
		const spawnedBy = run.tracing;
		const inputs = { title: task.title, goal: brief.goal, startUrl: brief.startUrl };
		try {
			const tracing = await createInstanceAiTraceContext({
				threadId: run.threadId,
				messageId: taskId,
				messageGroupId: run.messageGroupId,
				runId: taskId,
				userId: run.user.id,
				modelId: run.modelId,
				input: inputs,
				metadata: {
					cloud_browser_task: true,
					task_id: taskId,
					agent_id: agentId,
					spawned_by_run_id: run.runId,
					...(spawnedBy
						? {
								spawned_by_trace_id: spawnedBy.rootRun.otelTraceId ?? spawnedBy.rootRun.traceId,
								spawned_by_langsmith_run_id: spawnedBy.actorRun.id,
							}
						: {}),
				},
				proxyConfig: await this.options.resolveTracingProxyConfig(run.user),
				n8nVersion: N8N_VERSION,
				workflowSdkVersion: WORKFLOW_SDK_VERSION,
			});
			if (!tracing) return undefined;

			const actorRun = await tracing.startChildRun(tracing.rootRun, {
				name: `agent: ${CLOUD_BROWSER_AGENT_ROLE}`,
				canonicalName: `instance-ai.agent.${CLOUD_BROWSER_AGENT_ROLE}`,
				tags: ['sub-agent', 'background'],
				metadata: {
					agent_role: CLOUD_BROWSER_AGENT_ROLE,
					agent_id: agentId,
					task_id: taskId,
					execution_mode: 'background_subagent',
					trace_kind: tracing.traceKind,
				},
				inputs,
			});
			tracing.actorRun = actorRun;
			tracing.orchestratorRun = actorRun;
			return tracing;
		} catch (error) {
			this.options.logger.warn('Failed to create the cloud browser task trace', {
				threadId: run.threadId,
				taskId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	/**
	 * Waits for the user to answer a card the agent raised. The card event is already on the
	 * stream; this registers the answer's destination, so `POST /confirm/:requestId` resolves it.
	 */
	private async waitForAnswer(
		requestId: string,
		taskId: string,
		run: CloudBrowserRunOptions,
		openCards: Set<string>,
	): Promise<ConfirmationData> {
		const { threadId, user } = run;
		openCards.add(requestId);
		// Register before any await: the card is already on screen.
		const answer = new Promise<ConfirmationData>((resolve) => {
			this.options.runState.registerPendingConfirmation(requestId, {
				resolve,
				threadId,
				userId: user.id,
				createdAt: Date.now(),
			});
		});

		const taskStillRunning = await this.setPendingConfirmation(threadId, taskId, requestId);
		if (taskStillRunning) {
			await this.options.suspendedThreads.persistPendingConfirmation({
				requestId,
				threadId,
				userId: user.id,
				runId: run.runId,
				messageGroupId: run.messageGroupId,
				kind: 'inline',
			});
		} else {
			// The task is no longer running, so we close the card now since nothing will close it later
			this.options.runState.rejectPendingConfirmation(requestId);
		}
		try {
			return await answer;
		} finally {
			openCards.delete(requestId);
			if (taskStillRunning) await this.setPendingConfirmation(threadId, taskId, null);
		}
	}

	/**
	 * Returns false only when the task is no longer running. If the write fails, it logs a warning
	 * and returns true, so the task goes on.
	 */
	private async setPendingConfirmation(
		threadId: string,
		taskId: string,
		requestId: string | null,
	): Promise<boolean> {
		return await this.taskStore
			.setPendingConfirmation(threadId, taskId, requestId)
			.catch((error: unknown) => {
				this.options.logger.warn('Failed to record the card of a cloud browser task', {
					taskId,
					error: error instanceof Error ? error.message : String(error),
				});
				return true;
			});
	}

	/** Rejects a card that no agent waits for any more, and drops its row. */
	private async closeConfirmationCard(requestId: string): Promise<void> {
		this.options.runState.rejectPendingConfirmation(requestId);
		await this.options.suspendedThreads.dropPendingConfirmation(requestId);
	}

	/** True while a task of the thread runs or its result waits for delivery. */
	async hasPendingTasks(threadId: string): Promise<boolean> {
		return (await this.taskStore.list(threadId)).length > 0;
	}

	/**
	 * Fails the running tasks whose main stopped, for example on a restart, so they are delivered
	 * with the others and their card closes. Without this, they would show as running forever.
	 */
	private async failStoppedTasks(threadId: string): Promise<void> {
		const failed = await this.taskStore.failStale(
			threadId,
			new Date(Date.now() - TASK_STALE_AFTER_MS),
			{ outcome: 'failed', summary: TASK_STOPPED_SUMMARY },
		);
		for (const task of failed) {
			this.options.eventBus.publish(threadId, {
				type: 'agent-completed',
				runId: task.runId,
				agentId: task.agentId,
				detachedFromTurn: true,
				payload: {
					role: CLOUD_BROWSER_AGENT_ROLE,
					result: '',
					error: TASK_STOPPED_SUMMARY,
					status: 'error',
				},
			});
			// Its own main stopped, so nothing else closes the card it waited on.
			if (task.pendingConfirmationRequestId) {
				await this.closeConfirmationCard(task.pendingConfirmationRequestId);
			}
		}
	}

	/**
	 * Starts one follow-up run with every finished task the orchestrator has not heard about.
	 * Called when a task ends and when a run ends, so a result that arrives mid-run reaches the
	 * orchestrator as soon as that run is over. The tasks are removed once the run started, and
	 * released for the next delivery when no run started.
	 */
	async deliverPendingResults(user: User, threadId: string): Promise<void> {
		await this.failStoppedTasks(threadId);
		const undelivered = await this.taskStore.claimUndelivered(threadId);
		if (undelivered.length === 0) return;

		// A new message group id, so the result shows as a separate turn and not as part of the
		// turn that started the task: the user may have moved on since.
		const messageGroupId = `mg_${nanoid()}`;
		let runId = '';
		try {
			runId = await this.options.startFollowUpRun(
				user,
				threadId,
				buildTasksCompletedMessage(undelivered),
				messageGroupId,
			);
			if (!runId) return;

			for (const task of undelivered) {
				this.options.eventBus.publish(threadId, {
					type: 'agent-result-delivered',
					runId: task.runId,
					agentId: task.agentId,
					payload: {},
				});
			}
		} finally {
			// If the follow-up was started successfully, we consider it delivered and remove the task
			// otherwise, we release claim so it can be picked up for delivery again
			if (runId) {
				await this.taskStore.removeDelivered(threadId, undelivered);
			} else {
				await this.taskStore.releaseClaim(threadId, undelivered);
			}
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
	// The title and the summary come from the model and the pages, so they are cleaned like every
	// value in a block: they cannot end their task or the block. Secrets are removed first, so cutting
	// the summary cannot leave part of one.
	const entries = tasks.flatMap((task) => [
		`<task taskId="${task.taskId}" outcome="${task.outcome ?? 'failed'}">`,
		`Title: ${sanitisePromptText(scrubSecretsInText(task.title))}`,
		wrapUntrustedData(
			sanitisePromptText(scrubSecretsInText(task.summary ?? ''), TASK_SUMMARY_MAX_LENGTH),
			CLOUD_BROWSER_AGENT_ROLE,
		),
		'</task>',
	]);
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
