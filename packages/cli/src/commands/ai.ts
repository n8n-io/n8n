import { Command } from '@n8n/decorators';
import type {
	DomainAccessAction,
	InstanceAiConfirmationRequestPayload,
	InstanceAiConfirmRequest,
	InstanceAiWorkflowSetupNode,
	InstanceGatewayResourceDecision,
} from '@n8n/api-types';
import { confirmationRequestPayloadSchema } from '@n8n/api-types';
import { UnexpectedError, UserError } from 'n8n-workflow';
import readline from 'node:readline/promises';
import picocolors from 'picocolors';
import prompts from 'prompts';
import { z } from 'zod';

import { removeTrailingSlash } from '@/utils';

import { BaseCommand } from './base-command';

type SseFrame = {
	event: string;
	data?: string;
};

type ThreadMessage = {
	role?: string;
	content?: string;
};

type ThreadMessagesResponse = {
	threadId: string;
	messages: ThreadMessage[];
	nextEventId?: number;
};

type RunSyncFrame = {
	runId?: string;
	runIds: string[];
	messageGroupId?: string;
};

type ParsedInstanceAiEvent = {
	type: string;
	runId?: string;
	payload?: unknown;
};

type RunEventObserver = {
	onEvent?: (event: ParsedInstanceAiEvent) => void;
	onTextDelta?: (text: string) => void;
	onBeforeBlockingPrompt?: () => void;
	onAfterBlockingPrompt?: () => void;
};

type ThreadStatusResponse = {
	hasActiveRun: boolean;
	isSuspended: boolean;
	backgroundTasks: Array<{
		taskId: string;
		status: 'running' | 'completed' | 'failed' | 'cancelled';
		runId?: string;
		messageGroupId?: string;
	}>;
};

type SetupParameterPromptResult =
	| { state: 'cancelled' }
	| { state: 'skipped' }
	| { state: 'selected'; value: unknown };

type SetupEditableParameter = NonNullable<
	InstanceAiWorkflowSetupNode['editableParameters']
>[number];

const flagsSchema = z.object({
	prompt: z.string().alias('p').describe('Prompt to send to Instance AI').optional(),
	baseUrl: z
		.string()
		.describe('Base URL of a running n8n instance')
		.default('http://localhost:5678'),
	apiKey: z
		.string()
		.describe('n8n API key used as x-n8n-api-key header (or set N8N_API_KEY)')
		.optional(),
	threadId: z.string().uuid().describe('Existing thread ID to continue').optional(),
	researchMode: z.boolean().describe('Enable research mode for this prompt').optional(),
	timeout: z.number().int().positive().describe('Timeout in milliseconds').default(180000),
});

@Command({
	name: 'ai',
	description: 'Send a prompt to Instance AI, or start interactive mode when --prompt is omitted',
	examples: [
		'--apiKey <api-key>',
		'--prompt "Build a workflow that fetches top Hacker News stories"',
		'--prompt "Summarize this thread" --threadId <thread-id>',
	],
	flagsSchema,
})
export class AiCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	private apiKey = '';

	private restBaseUrl = '';

	override async init() {
		// Intentionally skip BaseCommand.init() — this command talks to an already
		// running n8n instance over HTTP and should not boot another local instance.
	}

	async run() {
		const { flags } = this;
		this.apiKey = flags.apiKey ?? process.env.N8N_API_KEY ?? '';

		if (!this.apiKey) {
			throw new UserError('Missing API key. Provide --apiKey or set N8N_API_KEY.');
		}

		this.restBaseUrl = `${removeTrailingSlash(flags.baseUrl)}/rest/instance-ai`;

		const threadId = await this.ensureThread(flags.threadId);
		if (flags.threadId && flags.prompt) {
			await this.loadAndPrintThreadHistory(threadId);
		}

		if (flags.prompt) {
			await this.executePrompt(threadId, flags.prompt, flags.researchMode, flags.timeout);
			return;
		}

		await this.runInteractiveShell(threadId, flags.researchMode, flags.timeout);
	}

	async catch(error: Error) {
		this.logger.error(error.message);
	}

	override async finally(error?: Error) {
		process.exit(error ? 1 : 0);
	}

	private async ensureThread(providedThreadId?: string): Promise<string> {
		type EnsureThreadResponse = {
			thread?: {
				id?: string;
			};
		};

		const payload = providedThreadId ? { threadId: providedThreadId } : {};
		const response = await this.requestJson<EnsureThreadResponse>('POST', '/threads', payload);
		const threadId = response.thread?.id;

		if (!threadId) {
			throw new UnexpectedError('Failed to get thread ID from instance-ai/threads response');
		}

		return threadId;
	}

	private async startRun(
		threadId: string,
		prompt: string,
		researchMode?: boolean,
	): Promise<string> {
		type StartRunResponse = {
			runId?: string;
		};

		const response = await this.requestJson<StartRunResponse>('POST', `/chat/${threadId}`, {
			message: prompt,
			researchMode,
		});

		if (!response.runId) {
			throw new UnexpectedError('Failed to get run ID from instance-ai/chat response');
		}

		return response.runId;
	}

	private async waitForRun(
		threadId: string,
		runId: string,
		timeoutMs: number,
		observer?: RunEventObserver,
	): Promise<'completed' | 'cancelled' | 'failed' | 'confirmation-required'> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);
		const trackedRunIds = new Set<string>([runId]);
		let trackedMessageGroupId: string | undefined;

		try {
			const response = await fetch(`${this.restBaseUrl}/events/${threadId}`, {
				method: 'GET',
				headers: this.authHeaders(),
				signal: controller.signal,
			});

			if (!response.ok) {
				throw await this.toHttpError(response, 'Failed to open Instance AI event stream');
			}

			if (!response.body) {
				throw new UnexpectedError('Instance AI event stream did not return a response body');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				let boundary = buffer.indexOf('\n\n');

				while (boundary !== -1) {
					const rawFrame = buffer.slice(0, boundary);
					buffer = buffer.slice(boundary + 2);
					boundary = buffer.indexOf('\n\n');

					const frame = this.parseSseFrame(rawFrame);
					if (!frame.data) continue;

					if (frame.event === 'run-sync') {
						const sync = this.tryParseRunSync(frame.data);
						if (!sync) continue;

						if (sync.runIds.includes(runId) || (sync.runId && trackedRunIds.has(sync.runId))) {
							for (const syncRunId of sync.runIds) trackedRunIds.add(syncRunId);
							if (sync.runId) trackedRunIds.add(sync.runId);
							if (sync.messageGroupId) trackedMessageGroupId = sync.messageGroupId;
						}

						continue;
					}

					const event = this.tryParseEvent(frame.data);
					if (!event) continue;

					const eventMessageGroupId = this.getEventMessageGroupId(event);
					if (
						event.type === 'run-start' &&
						eventMessageGroupId &&
						event.runId &&
						(trackedRunIds.has(event.runId) ||
							(trackedMessageGroupId !== undefined &&
								eventMessageGroupId === trackedMessageGroupId))
					) {
						trackedMessageGroupId = eventMessageGroupId;
						trackedRunIds.add(event.runId);
					}

					if (!event.runId || !trackedRunIds.has(event.runId)) continue;

					observer?.onEvent?.(event);

					if (event.type === 'text-delta') {
						const text = this.getTextDelta(event);
						if (text) {
							if (observer?.onTextDelta) {
								observer.onTextDelta(text);
							} else {
								process.stdout.write(text);
							}
						}
						continue;
					}

					if (event.type === 'confirmation-request') {
						observer?.onBeforeBlockingPrompt?.();
						let resolution: 'resolved' | 'resolve-in-ui';
						try {
							resolution = await this.resolveConfirmationRequest(threadId, event.payload);
						} finally {
							observer?.onAfterBlockingPrompt?.();
						}
						if (resolution === 'resolve-in-ui') {
							return 'confirmation-required';
						}
						continue;
					}

					if (event.type === 'error') {
						throw new UserError(this.getEventErrorMessage(event));
					}

					if (event.type === 'run-finish') {
						const status = this.getRunFinishStatus(event);
						if (!status) continue;

						if (status === 'completed' || status === 'cancelled') {
							const hasFollowUpActivity = await this.hasPendingFollowUpActivity(
								threadId,
								trackedRunIds,
								trackedMessageGroupId,
							);

							if (hasFollowUpActivity) continue;
						}

						return status;
					}
				}
			}

			throw new UnexpectedError('Instance AI event stream closed before run completed');
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				await this.cancelRun(threadId);
				throw new UserError(`Timed out waiting for run completion after ${timeoutMs}ms`);
			}
			throw error;
		} finally {
			clearTimeout(timeout);
		}
	}

	private async cancelRun(threadId: string) {
		const response = await fetch(`${this.restBaseUrl}/chat/${threadId}/cancel`, {
			method: 'POST',
			headers: this.authHeaders(),
		});

		if (!response.ok) {
			this.logger.warn('Failed to cancel timed-out run');
		}
	}

	private async executePrompt(
		threadId: string,
		prompt: string,
		researchMode: boolean | undefined,
		timeoutMs: number,
		observer?: RunEventObserver,
		ui?: FullscreenChatUi,
	): Promise<void> {
		const runId = await this.startRun(threadId, prompt, researchMode);
		const result = await this.waitForRun(threadId, runId, timeoutMs, observer);

		if (result === 'confirmation-required') {
			if (ui) {
				ui.addEntry('system', 'Run paused: user confirmation is required in the n8n UI.');
				ui.addEntry('system', `Thread ID: ${threadId}`);
				ui.addEntry('system', `Run ID: ${runId}`);
			} else {
				this.logger.info('');
				this.logger.info('Run paused: user confirmation is required in the n8n UI.');
				this.logger.info(`Thread ID: ${threadId}`);
				this.logger.info(`Run ID: ${runId}`);
			}
			return;
		}

		if (result !== 'completed') {
			throw new UserError(`Instance AI run finished with status: ${result}`);
		}

		if (!observer?.onTextDelta) {
			process.stdout.write('\n');
		}
	}

	private async runInteractiveShell(
		startingThreadId: string,
		researchMode: boolean | undefined,
		timeoutMs: number,
	): Promise<void> {
		if (!process.stdin.isTTY || !process.stdout.isTTY) {
			throw new UserError(
				'Interactive mode requires a TTY. Use --prompt in non-interactive environments.',
			);
		}

		const terminal = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		let threadId = startingThreadId;
		const ui = new FullscreenChatUi(threadId);
		const seenAssistantMessages = new Set<string>();
		let monitorThreadId = threadId;
		let monitorActive = false;
		let monitorInFlight = false;

		const monitorTimer = setInterval(async () => {
			if (!monitorActive || monitorInFlight) return;
			monitorInFlight = true;

			try {
				const status = await this.getThreadStatus(monitorThreadId);
				if (!status) return;

				const hasRunningBackgroundTasks = status.backgroundTasks.some(
					(task) => task.status === 'running',
				);
				monitorActive = status.hasActiveRun || status.isSuspended || hasRunningBackgroundTasks;

				if (hasRunningBackgroundTasks) {
					ui.setBackgroundNotice('Working in background... you can keep chatting');
				} else {
					ui.clearBackgroundNotice();
				}

				await this.syncNewAssistantMessagesToUi(monitorThreadId, ui, seenAssistantMessages);
			} catch {
				// Best effort background refresh
			} finally {
				monitorInFlight = false;
			}
		}, 1500);

		ui.enter();
		await this.loadAndPrintThreadHistory(threadId, ui);
		await this.seedSeenAssistantMessages(threadId, seenAssistantMessages);

		try {
			while (true) {
				const input = (await ui.prompt(terminal)).trim();
				if (!input) continue;

				const [command, ...args] = input.split(/\s+/);
				const normalized = command.toLowerCase();
				if (normalized === '/exit' || normalized === '/quit') {
					ui.addEntry('system', 'Closing interactive mode');
					break;
				}

				if (normalized === '/new') {
					threadId = await this.ensureThread();
					monitorThreadId = threadId;
					monitorActive = false;
					seenAssistantMessages.clear();
					ui.clearBackgroundNotice();
					ui.setThreadId(threadId);
					ui.addEntry('system', `Started new thread: ${threadId}`);
					await this.seedSeenAssistantMessages(threadId, seenAssistantMessages);
					continue;
				}

				if (normalized === '/thread') {
					if (args.length > 0) {
						threadId = await this.ensureThread(args[0]);
						monitorThreadId = threadId;
						monitorActive = false;
						seenAssistantMessages.clear();
						ui.clearBackgroundNotice();
						ui.setThreadId(threadId);
						ui.addEntry('system', `Switched thread: ${threadId}`);
						await this.loadAndPrintThreadHistory(threadId, ui);
						await this.seedSeenAssistantMessages(threadId, seenAssistantMessages);
						continue;
					}

					ui.addEntry('system', `Current thread: ${threadId}`);
					continue;
				}

				ui.addEntry('user', input);
				ui.beginAssistantRun();
				monitorActive = false;
				ui.clearBackgroundNotice();

				await this.executePrompt(
					threadId,
					input,
					researchMode,
					timeoutMs,
					{
						onEvent: (event) => {
							ui.handleEvent(event);
						},
						onTextDelta: (text) => {
							ui.appendAssistantText(text);
						},
						onBeforeBlockingPrompt: () => {
							ui.suspendForPrompt();
						},
						onAfterBlockingPrompt: () => {
							ui.resumeAfterPrompt();
						},
					},
					ui,
				);

				const completedAssistantMessage = ui.endAssistantRun();
				if (completedAssistantMessage) {
					seenAssistantMessages.add(this.threadMessageKey('assistant', completedAssistantMessage));
				}

				monitorActive = await this.updateBackgroundActivityNotice(threadId, ui);
				if (monitorActive) {
					await this.syncNewAssistantMessagesToUi(threadId, ui, seenAssistantMessages);
				}
			}
		} finally {
			clearInterval(monitorTimer);
			ui.exit();
			terminal.close();
		}
	}

	private async resolveConfirmationRequest(
		threadId: string,
		payload: unknown,
	): Promise<'resolved' | 'resolve-in-ui'> {
		const parsedPayload = confirmationRequestPayloadSchema.safeParse(payload);
		if (!parsedPayload.success) {
			throw new UserError('Received malformed confirmation request from Instance AI');
		}

		if (!process.stdin.isTTY || !process.stdout.isTTY) {
			this.logger.info('');
			this.logger.info('Confirmation is required, but no interactive terminal is available.');
			this.logger.info(
				`Resolve in UI for thread ${threadId}, request ${parsedPayload.data.requestId}.`,
			);
			return 'resolve-in-ui';
		}

		this.logger.info('');
		this.logger.info(`Confirmation required: ${parsedPayload.data.message}`);
		this.printConfirmationContext(parsedPayload.data);
		const request = await this.promptConfirmationRequest(parsedPayload.data);
		if (!request) {
			this.logger.info('Confirmation deferred to later. Continue in n8n UI.');
			return 'resolve-in-ui';
		}

		await this.requestJson<{ ok: boolean }>(
			'POST',
			`/confirm/${encodeURIComponent(parsedPayload.data.requestId)}`,
			request,
		);

		this.logger.info('Confirmation submitted.');
		return 'resolved';
	}

	private async promptConfirmationRequest(
		payload: InstanceAiConfirmationRequestPayload,
	): Promise<InstanceAiConfirmRequest | null> {
		if (payload.setupRequests && payload.setupRequests.length > 0) {
			return await this.promptSetupWorkflowConfirmation(payload.setupRequests);
		}

		if (payload.resourceDecision || payload.inputType === 'resource-decision') {
			return await this.promptResourceDecisionConfirmation(payload);
		}

		if (payload.domainAccess) {
			return await this.promptDomainAccessConfirmation(payload);
		}

		if (payload.questions && payload.questions.length > 0) {
			return await this.promptQuestionsConfirmation(payload);
		}

		if (payload.credentialRequests && payload.credentialRequests.length > 0) {
			return await this.promptCredentialSelectionConfirmation(payload);
		}

		return await this.promptApprovalConfirmation(payload);
	}

	private printConfirmationContext(payload: InstanceAiConfirmationRequestPayload): void {
		if (payload.introMessage && payload.introMessage.trim().length > 0) {
			this.logger.info(payload.introMessage);
		}

		if (payload.inputType === 'plan-review' || payload.tasks || payload.planItems) {
			const tasks = payload.tasks?.tasks ?? [];
			if (tasks.length > 0) {
				this.logger.info('Plan checklist:');
				for (const task of tasks) {
					this.logger.info(`- [${task.status}] ${task.description}`);
				}
			}

			if (payload.planItems && payload.planItems.length > 0) {
				this.logger.info('Plan details:');
				for (const item of payload.planItems) {
					this.logger.info(`- ${item.title} (${item.kind})`);
					if (item.spec.trim().length > 0) {
						this.logger.info(`  ${item.spec}`);
					}
				}
			}
		}

		if (payload.questions && payload.questions.length > 0) {
			this.logger.info(`Questions: ${payload.questions.length}`);
			for (const question of payload.questions) {
				this.logger.info(`- ${question.question}`);
			}
		}

		if (payload.credentialRequests && payload.credentialRequests.length > 0) {
			this.logger.info('Credential requests:');
			for (const request of payload.credentialRequests) {
				this.logger.info(
					`- ${request.credentialType}: ${request.reason} (${request.existingCredentials.length} existing)`,
				);
			}
		}

		if (payload.domainAccess) {
			this.logger.info(`Domain access: ${payload.domainAccess.host} (${payload.domainAccess.url})`);
		}

		if (payload.resourceDecision) {
			this.logger.info(
				`Resource access: ${payload.resourceDecision.toolGroup} -> ${payload.resourceDecision.resource}`,
			);
			this.logger.info(`Options: ${payload.resourceDecision.options.join(', ')}`);
		}

		if (payload.setupRequests && payload.setupRequests.length > 0) {
			this.logger.info(`Workflow setup sections: ${payload.setupRequests.length}`);
			for (const setup of payload.setupRequests) {
				const editable = setup.editableParameters?.map((parameter) => parameter.name) ?? [];
				this.logger.info(
					`- ${setup.node.name}${
						setup.credentialType ? ` credential=${setup.credentialType}` : ''
					}${editable.length > 0 ? ` params=${editable.join(', ')}` : ''}`,
				);
			}
		}
	}

	private async promptApprovalConfirmation(
		payload: InstanceAiConfirmationRequestPayload,
	): Promise<InstanceAiConfirmRequest | null> {
		if (payload.inputType === 'continue') {
			const decision = await this.promptSelect(
				'Choose confirmation action',
				[
					{ title: 'Continue', value: 'continue' },
					{ title: 'Resolve in UI', value: 'ui' },
				],
				{ defaultValue: 'ui' },
			);

			if (!decision || decision === 'ui') return null;
			return { kind: 'approval', approved: true };
		}

		const decision = await this.promptSelect(
			'Choose confirmation action',
			[
				{ title: 'Approve', value: 'approve' },
				{ title: 'Deny', value: 'deny' },
				{ title: 'Resolve in UI', value: 'ui' },
			],
			{ defaultValue: 'ui' },
		);

		if (!decision || decision === 'ui') return null;

		const shouldAskForText = payload.inputType === 'text' || payload.inputType === 'plan-review';
		let userInput: string | undefined;
		if (shouldAskForText) {
			const text = await this.promptText('Optional note (leave empty to skip)');
			if (text === null) return null;
			const trimmed = text.trim();
			if (trimmed.length > 0) userInput = trimmed;
		}

		return {
			kind: 'approval',
			approved: decision === 'approve',
			...(userInput ? { userInput } : {}),
		};
	}

	private async promptQuestionsConfirmation(
		payload: InstanceAiConfirmationRequestPayload,
	): Promise<InstanceAiConfirmRequest | null> {
		const questions = payload.questions ?? [];
		const answers: Array<{
			questionId: string;
			selectedOptions: string[];
			customText?: string;
			skipped?: boolean;
		}> = [];

		for (const question of questions) {
			if (question.type === 'single') {
				const selected = await this.promptSelect(question.question, [
					...(question.options ?? []).map((option) => ({ title: option, value: option })),
					{ title: 'Skip', value: '__skip' },
				]);

				if (!selected) return null;
				if (selected === '__skip') {
					answers.push({ questionId: question.id, selectedOptions: [], skipped: true });
				} else {
					answers.push({ questionId: question.id, selectedOptions: [selected] });
				}
				continue;
			}

			if (question.type === 'multi') {
				const selected = await this.promptMultiSelect(
					`${question.question} (choose one or more, or none to skip)`,
					(question.options ?? []).map((option) => ({ title: option, value: option })),
				);

				if (selected === null) return null;
				if (selected.length === 0) {
					answers.push({ questionId: question.id, selectedOptions: [], skipped: true });
				} else {
					answers.push({ questionId: question.id, selectedOptions: selected });
				}
				continue;
			}

			const text = await this.promptText(`${question.question} (leave empty to skip)`);
			if (text === null) return null;
			const trimmed = text.trim();
			if (trimmed.length === 0) {
				answers.push({ questionId: question.id, selectedOptions: [], skipped: true });
			} else {
				answers.push({ questionId: question.id, selectedOptions: [], customText: trimmed });
			}
		}

		return { kind: 'questions', answers };
	}

	private async promptCredentialSelectionConfirmation(
		payload: InstanceAiConfirmationRequestPayload,
	): Promise<InstanceAiConfirmRequest | null> {
		const credentialRequests = payload.credentialRequests ?? [];
		const credentials: Record<string, string> = {};

		for (const request of credentialRequests) {
			if (request.existingCredentials.length === 0) {
				this.logger.info(
					`No existing credentials available for ${request.credentialType}. Resolve this request in UI.`,
				);
				return null;
			}

			const selectedCredential = await this.promptSelect(
				`Select credential for type ${request.credentialType}`,
				[
					...request.existingCredentials.map((credential) => ({
						title: credential.name,
						value: credential.id,
					})),
					{ title: 'Resolve in UI', value: 'ui' },
				],
				{ defaultValue: 'ui' },
			);

			if (!selectedCredential || selectedCredential === 'ui') return null;
			credentials[request.credentialType] = selectedCredential;
		}

		return { kind: 'credentialSelection', credentials };
	}

	private async promptDomainAccessConfirmation(
		payload: InstanceAiConfirmationRequestPayload,
	): Promise<InstanceAiConfirmRequest | null> {
		const host = payload.domainAccess?.host ?? 'unknown host';
		const decision = await this.promptSelect(
			`Choose domain access policy for ${host}`,
			[
				{ title: 'Allow once', value: 'allow_once' },
				{ title: 'Allow domain', value: 'allow_domain' },
				{ title: 'Allow all', value: 'allow_all' },
				{ title: 'Deny', value: 'deny' },
				{ title: 'Resolve in UI', value: 'ui' },
			],
			{ defaultValue: 'ui' },
		);

		if (!decision || decision === 'ui') return null;
		if (decision === 'deny') return { kind: 'domainAccessDeny' };
		if (!this.isDomainAccessAction(decision)) return null;

		return { kind: 'domainAccessApprove', domainAccessAction: decision };
	}

	private async promptResourceDecisionConfirmation(
		payload: InstanceAiConfirmationRequestPayload,
	): Promise<InstanceAiConfirmRequest | null> {
		const options = payload.resourceDecision?.options ?? [
			'denyOnce',
			'allowOnce',
			'allowForSession',
		];
		const decision = await this.promptSelect(
			'Choose resource access decision',
			[
				...options.map((option) => ({
					title: this.resourceDecisionLabel(option),
					value: option,
				})),
				{ title: 'Resolve in UI', value: 'ui' },
			],
			{ defaultValue: 'ui' },
		);

		if (!decision || decision === 'ui') return null;
		if (!this.isResourceDecision(decision)) return null;

		return { kind: 'resourceDecision', resourceDecision: decision };
	}

	private async promptSetupWorkflowConfirmation(
		setupRequests: InstanceAiWorkflowSetupNode[],
	): Promise<InstanceAiConfirmRequest | null> {
		const nodeCredentials: Record<string, Record<string, string>> = {};
		const nodeParameters: Record<string, Record<string, unknown>> = {};

		for (const request of setupRequests) {
			const nodeName = request.node.name;

			if (
				request.credentialType &&
				request.existingCredentials &&
				request.existingCredentials.length > 0
			) {
				const selectedCredential = await this.promptSelect(
					`Select credential for ${nodeName} (${request.credentialType})`,
					[
						...request.existingCredentials.map((credential) => ({
							title: credential.name,
							value: credential.id,
						})),
						{ title: 'Skip this credential for now', value: '__skip' },
					],
				);

				if (!selectedCredential) return null;
				if (selectedCredential !== '__skip') {
					const perNode = nodeCredentials[nodeName] ?? {};
					perNode[request.credentialType] = selectedCredential;
					nodeCredentials[nodeName] = perNode;
				}
			}

			for (const parameter of request.editableParameters ?? []) {
				const result = await this.promptSetupParameter(request, parameter);
				if (result.state === 'cancelled') return null;
				if (result.state === 'skipped') continue;

				const perNode = nodeParameters[nodeName] ?? {};
				this.setPathValue(perNode, parameter.name, result.value);
				nodeParameters[nodeName] = perNode;
			}
		}

		const testableTriggerNodes = setupRequests
			.filter((request) => request.isTrigger && request.isTestable)
			.map((request) => request.node.name);

		const action = await this.promptSelect(
			'Choose setup action',
			[
				{ title: 'Apply configuration', value: 'apply' },
				...(testableTriggerNodes.length > 0
					? [{ title: 'Apply and test a trigger', value: 'test-trigger' }]
					: []),
				{ title: 'Do this later', value: 'defer' },
				{ title: 'Resolve in UI', value: 'ui' },
			],
			{ defaultValue: 'defer' },
		);

		if (!action || action === 'ui') return null;
		if (action === 'defer') return { kind: 'approval', approved: false };

		const hasNodeCredentials = Object.keys(nodeCredentials).length > 0;
		const hasNodeParameters = Object.keys(nodeParameters).length > 0;

		if (action === 'test-trigger') {
			const triggerNode =
				testableTriggerNodes.length === 1
					? testableTriggerNodes[0]
					: await this.promptSelect(
							'Choose trigger node to test',
							testableTriggerNodes.map((nodeName) => ({ title: nodeName, value: nodeName })),
						);

			if (!triggerNode) return null;

			return {
				kind: 'setupWorkflowTestTrigger',
				testTriggerNode: triggerNode,
				...(hasNodeCredentials ? { nodeCredentials } : {}),
				...(hasNodeParameters ? { nodeParameters } : {}),
			};
		}

		return {
			kind: 'setupWorkflowApply',
			...(hasNodeCredentials ? { nodeCredentials } : {}),
			...(hasNodeParameters ? { nodeParameters } : {}),
		};
	}

	private async promptSetupParameter(
		request: InstanceAiWorkflowSetupNode,
		parameter: SetupEditableParameter,
	): Promise<SetupParameterPromptResult> {
		if (!parameter) return { state: 'skipped' };

		const currentValue = this.getPathValue(request.node.parameters, parameter.name);
		const message = `${request.node.name}: ${parameter.displayName}`;

		if (parameter.options && parameter.options.length > 0) {
			const selectedIndex = await this.promptSelect(message, [
				...parameter.options.map((option, index) => ({
					title: option.name,
					value: index.toString(),
				})),
				...(!parameter.required ? [{ title: 'Skip', value: '__skip' }] : []),
			]);

			if (!selectedIndex) return { state: 'cancelled' };
			if (selectedIndex === '__skip') return { state: 'skipped' };

			const index = Number.parseInt(selectedIndex, 10);
			if (Number.isNaN(index)) return { state: 'skipped' };
			const option = parameter.options[index];
			if (!option) return { state: 'skipped' };

			return { state: 'selected', value: option.value };
		}

		if (parameter.type === 'boolean') {
			const selected = await this.promptSelect(message, [
				{ title: 'True', value: 'true' },
				{ title: 'False', value: 'false' },
				...(!parameter.required ? [{ title: 'Skip', value: '__skip' }] : []),
			]);

			if (!selected) return { state: 'cancelled' };
			if (selected === '__skip') return { state: 'skipped' };

			return { state: 'selected', value: selected === 'true' };
		}

		const initial =
			currentValue === undefined || currentValue === null
				? ''
				: this.toInitialPromptValue(currentValue);
		const entered = await this.promptText(
			`${message}${parameter.required ? '' : ' (leave empty to skip)'}`,
			initial,
		);

		if (entered === null) return { state: 'cancelled' };

		const trimmed = entered.trim();
		if (trimmed.length === 0 && !parameter.required) {
			return { state: 'skipped' };
		}

		if (parameter.type === 'number') {
			const numeric = Number(trimmed.length > 0 ? trimmed : entered);
			if (Number.isNaN(numeric)) {
				this.logger.warn(`Invalid number for ${message}; skipping this field.`);
				return { state: 'skipped' };
			}

			return { state: 'selected', value: numeric };
		}

		return { state: 'selected', value: entered };
	}

	private async promptSelect(
		message: string,
		choices: Array<{ title: string; value: string }>,
		options?: { defaultValue?: string },
	): Promise<string | null> {
		const initial =
			typeof options?.defaultValue === 'string'
				? Math.max(
						choices.findIndex((choice) => choice.value === options.defaultValue),
						0,
					)
				: 0;

		const answer = await this.runPrompt({
			type: 'select',
			name: 'value',
			message,
			choices,
			initial,
		});

		return this.readAnswerString(answer, 'value');
	}

	private async promptMultiSelect(
		message: string,
		choices: Array<{ title: string; value: string }>,
	): Promise<string[] | null> {
		const answer = await this.runPrompt({
			type: 'multiselect',
			name: 'value',
			message,
			choices,
		});

		return this.readAnswerStringArray(answer, 'value');
	}

	private async promptText(message: string, initial = ''): Promise<string | null> {
		const answer = await this.runPrompt({
			type: 'text',
			name: 'value',
			message,
			initial,
		});

		return this.readAnswerString(answer, 'value');
	}

	private async runPrompt(question: unknown): Promise<unknown | null> {
		let cancelled = false;
		const answer = await prompts(question, {
			onCancel: () => {
				cancelled = true;
				return false;
			},
		});

		if (cancelled) return null;
		return answer;
	}

	private readAnswerString(answer: unknown, key: string): string | null {
		if (!answer || typeof answer !== 'object') return null;
		const value = Reflect.get(answer, key);
		return typeof value === 'string' ? value : null;
	}

	private readAnswerStringArray(answer: unknown, key: string): string[] | null {
		if (!answer || typeof answer !== 'object') return null;
		const value = Reflect.get(answer, key);
		if (!Array.isArray(value)) return null;
		if (!value.every((entry) => typeof entry === 'string')) return null;
		return value;
	}

	private getPathValue(source: unknown, path: string): unknown {
		if (!source || typeof source !== 'object') return undefined;
		const keys = path.match(/[^.[\]]+/g) ?? [];
		let current: unknown = source;

		for (const key of keys) {
			if (!current || typeof current !== 'object') return undefined;
			current = Reflect.get(current, key);
		}

		return current;
	}

	private setPathValue(target: Record<string, unknown>, path: string, value: unknown): void {
		const keys = path.match(/[^.[\]]+/g) ?? [];
		if (keys.length === 0) return;

		let current: unknown = target;
		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			if (!current || typeof current !== 'object') return;

			const nextValue = Reflect.get(current, key);
			if (!nextValue || typeof nextValue !== 'object' || Array.isArray(nextValue)) {
				Reflect.set(current, key, {});
			}

			current = Reflect.get(current, key);
		}

		if (!current || typeof current !== 'object') return;
		Reflect.set(current, keys[keys.length - 1], value);
	}

	private toInitialPromptValue(value: unknown): string {
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'boolean') return String(value);
		return '';
	}

	private isResourceDecision(value: string): value is InstanceGatewayResourceDecision {
		return value === 'denyOnce' || value === 'allowOnce' || value === 'allowForSession';
	}

	private isDomainAccessAction(value: string): value is DomainAccessAction {
		return value === 'allow_once' || value === 'allow_domain' || value === 'allow_all';
	}

	private resourceDecisionLabel(option: string): string {
		if (option === 'denyOnce') return 'Deny once';
		if (option === 'allowOnce') return 'Allow once';
		if (option === 'allowForSession') return 'Allow for session';
		return option;
	}

	private async loadAndPrintThreadHistory(threadId: string, ui?: FullscreenChatUi): Promise<void> {
		const history = await this.requestJson<ThreadMessagesResponse>(
			'GET',
			`/threads/${encodeURIComponent(threadId)}/messages?limit=100`,
		);

		if (!history.messages.length) return;

		if (ui) {
			for (const message of history.messages) {
				if (!message.content || message.content.trim().length === 0) continue;
				ui.addEntry(message.role === 'assistant' ? 'assistant' : 'user', message.content);
			}

			return;
		}

		this.logger.info('');
		this.logger.info(
			`Loaded ${history.messages.length} previous message(s) from thread ${threadId}:`,
		);

		for (const message of history.messages) {
			if (!message.content || message.content.trim().length === 0) continue;

			const role = message.role === 'assistant' ? 'Assistant' : 'User';
			this.logger.info(`${role}: ${message.content}`);
		}

		this.logger.info('');
	}

	private threadMessageKey(role: string, content: string): string {
		return `${role}\u0000${content}`;
	}

	private async seedSeenAssistantMessages(
		threadId: string,
		seenAssistantMessages: Set<string>,
	): Promise<void> {
		const history = await this.requestJson<ThreadMessagesResponse>(
			'GET',
			`/threads/${encodeURIComponent(threadId)}/messages?limit=100`,
		);

		for (const message of history.messages) {
			if (message.role !== 'assistant') continue;
			if (!message.content || message.content.trim().length === 0) continue;
			seenAssistantMessages.add(this.threadMessageKey('assistant', message.content));
		}
	}

	private async syncNewAssistantMessagesToUi(
		threadId: string,
		ui: FullscreenChatUi,
		seenAssistantMessages: Set<string>,
	): Promise<void> {
		const history = await this.requestJson<ThreadMessagesResponse>(
			'GET',
			`/threads/${encodeURIComponent(threadId)}/messages?limit=100`,
		);

		for (const message of history.messages) {
			if (message.role !== 'assistant') continue;
			if (!message.content || message.content.trim().length === 0) continue;

			const key = this.threadMessageKey('assistant', message.content);
			if (seenAssistantMessages.has(key)) continue;

			seenAssistantMessages.add(key);
			ui.addEntry('assistant', message.content);
		}
	}

	private parseSseFrame(rawFrame: string): SseFrame {
		const lines = rawFrame.replaceAll('\r', '').split('\n');
		let event = 'message';
		const dataParts: string[] = [];

		for (const line of lines) {
			if (line.startsWith(':')) continue;
			if (line.startsWith('event:')) {
				event = line.slice(6).trim();
				continue;
			}
			if (line.startsWith('data:')) {
				dataParts.push(line.slice(5).trimStart());
			}
		}

		return {
			event,
			data: dataParts.length > 0 ? dataParts.join('\n') : undefined,
		};
	}

	private tryParseEvent(value: string): ParsedInstanceAiEvent | null {
		try {
			const parsed: unknown = JSON.parse(value);
			if (!parsed || typeof parsed !== 'object') return null;

			const candidate = parsed as {
				type?: unknown;
				runId?: unknown;
				payload?: unknown;
			};

			if (typeof candidate.type !== 'string') return null;

			return {
				type: candidate.type,
				runId: typeof candidate.runId === 'string' ? candidate.runId : undefined,
				payload: candidate.payload,
			};
		} catch {
			return null;
		}
	}

	private tryParseRunSync(value: string): RunSyncFrame | null {
		try {
			const parsed: unknown = JSON.parse(value);
			if (!parsed || typeof parsed !== 'object') return null;

			const candidate = parsed as {
				runId?: unknown;
				runIds?: unknown;
				messageGroupId?: unknown;
			};

			const runIds = Array.isArray(candidate.runIds)
				? candidate.runIds.filter((id): id is string => typeof id === 'string')
				: [];

			if (runIds.length === 0 && typeof candidate.runId !== 'string') return null;

			return {
				runId: typeof candidate.runId === 'string' ? candidate.runId : undefined,
				runIds,
				messageGroupId:
					typeof candidate.messageGroupId === 'string' ? candidate.messageGroupId : undefined,
			};
		} catch {
			return null;
		}
	}

	private getEventMessageGroupId(event: { payload?: unknown }): string | undefined {
		if (!event.payload || typeof event.payload !== 'object') return undefined;
		const payload = event.payload as { messageGroupId?: unknown };
		return typeof payload.messageGroupId === 'string' ? payload.messageGroupId : undefined;
	}

	private async hasPendingFollowUpActivity(
		threadId: string,
		_trackedRunIds: Set<string>,
		_trackedMessageGroupId?: string,
	): Promise<boolean> {
		try {
			const status = await this.requestJson<ThreadStatusResponse>(
				'GET',
				`/threads/${encodeURIComponent(threadId)}/status`,
			);

			if (status.hasActiveRun || status.isSuspended) {
				return true;
			}

			return false;
		} catch (error) {
			this.logger.warn(`Failed to determine follow-up activity: ${this.getErrorMessage(error)}`);
			return false;
		}
	}

	private getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}

	private getTextDelta(event: { payload?: unknown }): string | null {
		if (!event.payload || typeof event.payload !== 'object') return null;
		const payload = event.payload as { text?: unknown };
		return typeof payload.text === 'string' ? payload.text : null;
	}

	private getEventErrorMessage(event: { payload?: unknown }): string {
		if (!event.payload || typeof event.payload !== 'object') {
			return 'Instance AI run failed';
		}

		const payload = event.payload as { content?: unknown };
		if (typeof payload.content === 'string' && payload.content.length > 0) {
			return payload.content;
		}

		return 'Instance AI run failed';
	}

	private getRunFinishStatus(event: {
		payload?: unknown;
	}): 'completed' | 'cancelled' | 'failed' | null {
		if (!event.payload || typeof event.payload !== 'object') return null;
		const payload = event.payload as { status?: unknown };
		return payload.status === 'completed' ||
			payload.status === 'cancelled' ||
			payload.status === 'failed'
			? payload.status
			: null;
	}

	private async getThreadStatus(threadId: string): Promise<ThreadStatusResponse | null> {
		try {
			return await this.requestJson<ThreadStatusResponse>(
				'GET',
				`/threads/${encodeURIComponent(threadId)}/status`,
			);
		} catch {
			return null;
		}
	}

	private async updateBackgroundActivityNotice(
		threadId: string,
		ui: FullscreenChatUi,
	): Promise<boolean> {
		const status = await this.getThreadStatus(threadId);
		if (!status) {
			ui.clearBackgroundNotice();
			return false;
		}

		const hasRunningBackgroundTasks = status.backgroundTasks.some(
			(task) => task.status === 'running',
		);
		if (hasRunningBackgroundTasks) {
			ui.setBackgroundNotice('Working in background... you can keep chatting');
		} else {
			ui.clearBackgroundNotice();
		}

		return status.hasActiveRun || status.isSuspended || hasRunningBackgroundTasks;
	}

	private authHeaders(contentType = false): Record<string, string> {
		return {
			'x-n8n-api-key': this.apiKey,
			...(contentType ? { 'content-type': 'application/json' } : {}),
		};
	}

	private async requestJson<T>(method: 'POST' | 'GET', path: string, body?: unknown): Promise<T> {
		const response = await fetch(`${this.restBaseUrl}${path}`, {
			method,
			headers: this.authHeaders(body !== undefined),
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			throw await this.toHttpError(response, `Request failed: ${method} ${path}`);
		}

		const parsed = (await response.json()) as unknown;
		if (parsed && typeof parsed === 'object' && 'data' in parsed) {
			return (parsed as { data: T }).data;
		}

		return parsed as T;
	}

	private async toHttpError(response: Response, messagePrefix: string): Promise<UserError> {
		const responseText = await response.text();
		const hint =
			response.status === 401 || response.status === 403
				? 'Check your API key and required scopes (instanceAi:message).'
				: response.status === 404
					? 'Check base URL and that Instance AI is enabled on the target instance.'
					: undefined;

		return new UserError(
			`${messagePrefix} (HTTP ${response.status})${
				hint ? ` ${hint}` : ''
			}${responseText ? ` Response: ${responseText}` : ''}`,
		);
	}
}

type UiEntryKind = 'user' | 'assistant' | 'system' | 'error';

type UiEntry = {
	kind: UiEntryKind;
	text: string;
};

class FullscreenChatUi {
	private readonly entries: UiEntry[] = [];

	private activeAssistantIndex: number | null = null;

	private isBusy = false;

	private spinnerIndex = 0;

	private spinner: NodeJS.Timeout | null = null;

	private activityText = 'Thinking';

	private threadId: string;

	private readonly spinnerFrames = ['-', '\\', '|', '/'];

	private isSuspended = false;

	private backgroundNotice: string | null = null;

	private startNewAssistantMessageOnNextDelta = false;

	constructor(threadId: string) {
		this.threadId = threadId;
	}

	enter() {
		if (!process.stdout.isTTY) return;
		process.stdout.write('\u001b[?1049h\u001b[?25l');
		this.render();
	}

	exit() {
		this.stopSpinner();
		this.isSuspended = false;
		if (!process.stdout.isTTY) return;
		process.stdout.write('\u001b[?25h\u001b[?1049l');
	}

	suspendForPrompt() {
		if (!process.stdout.isTTY || this.isSuspended) return;
		this.stopSpinner();
		this.isSuspended = true;
		process.stdout.write('\u001b[?25h');
	}

	resumeAfterPrompt() {
		if (!process.stdout.isTTY || !this.isSuspended) return;
		this.isSuspended = false;
		process.stdout.write('\u001b[?25l');
		if (this.isBusy) this.startSpinner();
		this.render();
	}

	setThreadId(threadId: string) {
		this.threadId = threadId;
		this.render();
	}

	addEntry(kind: UiEntryKind, text: string) {
		this.entries.push({ kind, text });
		if (this.entries.length > 500) {
			this.entries.splice(0, this.entries.length - 500);
		}
		this.render();
	}

	beginAssistantRun() {
		this.isBusy = true;
		this.activityText = 'Thinking';
		this.backgroundNotice = null;
		this.startNewAssistantMessageOnNextDelta = false;
		this.activeAssistantIndex = this.entries.length;
		this.entries.push({ kind: 'assistant', text: '' });
		this.startSpinner();
		this.render();
	}

	endAssistantRun(): string | null {
		let completedMessage: string | null = null;
		if (this.activeAssistantIndex !== null) {
			const current = this.entries[this.activeAssistantIndex];
			if (current && current.kind === 'assistant' && current.text.trim().length > 0) {
				completedMessage = current.text;
			}
		}

		this.isBusy = false;
		this.stopSpinner();
		this.activityText = 'Ready';
		this.startNewAssistantMessageOnNextDelta = false;
		this.activeAssistantIndex = null;
		this.render();

		return completedMessage;
	}

	setBackgroundNotice(message: string) {
		this.backgroundNotice = message;
		this.render();
	}

	clearBackgroundNotice() {
		if (!this.backgroundNotice) return;
		this.backgroundNotice = null;
		this.render();
	}

	appendAssistantText(text: string) {
		if (this.startNewAssistantMessageOnNextDelta) {
			this.activeAssistantIndex = this.entries.length;
			this.entries.push({ kind: 'assistant', text: '' });
			this.startNewAssistantMessageOnNextDelta = false;
		}

		if (this.activeAssistantIndex === null) {
			this.activeAssistantIndex = this.entries.length;
			this.entries.push({ kind: 'assistant', text: '' });
		}

		const current = this.entries[this.activeAssistantIndex];
		if (!current || current.kind !== 'assistant') return;

		current.text += text;
		this.render();
	}

	handleEvent(event: ParsedInstanceAiEvent) {
		if (event.type === 'run-start') {
			this.activityText = 'Thinking';
			this.render();
			return;
		}

		if (event.type === 'reasoning-delta') {
			this.activityText = 'Thinking';
			this.render();
			return;
		}

		if (event.type === 'status') {
			const text = this.readPayloadString(event.payload, 'message');
			if (text && text.trim().length > 0) {
				this.activityText = text;
			}
			this.render();
			return;
		}

		if (event.type === 'tool-call') {
			const toolName = this.readPayloadString(event.payload, 'toolName') ?? 'unknown-tool';
			this.activityText = `Using ${toolName}`;
			this.render();
			return;
		}

		if (event.type === 'tool-result') {
			this.activityText = 'Thinking';
			this.render();
			return;
		}

		if (event.type === 'tool-error') {
			const error = this.readPayloadString(event.payload, 'error') ?? 'Tool failed';
			this.addEntry('error', `Tool error: ${error}`);
			this.activityText = 'Tool error';
			this.render();
			return;
		}

		if (event.type === 'confirmation-request') {
			this.startNewAssistantMessageOnNextDelta = true;
			this.activityText = 'Waiting for confirmation';
			this.render();
			return;
		}

		if (event.type === 'run-finish') {
			this.activityText = 'Done';
			this.render();
		}
	}

	async prompt(terminal: readline.Interface): Promise<string> {
		this.render();
		const rows = process.stdout.rows ?? 40;
		process.stdout.write(`\u001b[${String(rows)};1H\u001b[2K`);
		return await terminal.question(`${picocolors.bold(picocolors.cyan('You'))} > `);
	}

	private startSpinner() {
		if (this.spinner) return;
		this.spinner = setInterval(() => {
			this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
			this.render();
		}, 120);
	}

	private stopSpinner() {
		if (!this.spinner) return;
		clearInterval(this.spinner);
		this.spinner = null;
	}

	private render() {
		if (!process.stdout.isTTY || this.isSuspended) return;

		const cols = process.stdout.columns ?? 100;
		const rows = process.stdout.rows ?? 40;
		const transcriptHeight = Math.max(5, rows - 5);

		const header = [
			picocolors.bold('Instance AI - Interactive Shell'),
			picocolors.dim(`Thread: ${this.threadId}`),
		];

		const transcriptLines = this.entries.flatMap((entry) => this.formatEntry(entry, cols));
		const visibleTranscript = transcriptLines.slice(
			Math.max(0, transcriptLines.length - transcriptHeight),
		);

		const separator = picocolors.dim('-'.repeat(Math.max(10, cols)));
		const frame = this.spinnerFrames[this.spinnerIndex] ?? '-';
		const footer = this.isBusy
			? `${picocolors.yellow(`[AI ${frame}]`)} ${this.trimToWidth(this.activityText, cols - 8)}`
			: this.backgroundNotice
				? `${picocolors.yellow('[BACKGROUND]')} ${this.trimToWidth(this.backgroundNotice, cols - 13)}`
				: `${picocolors.green('[READY]')} Type a message (/new, /thread, /quit)`;

		const out: string[] = [];
		out.push('\u001b[2J\u001b[H');
		out.push(...header);
		out.push(separator);
		out.push(...visibleTranscript);
		out.push(separator);
		out.push(footer);

		process.stdout.write(out.join('\n'));
	}

	private formatEntry(entry: UiEntry, width: number): string[] {
		const labels: Record<UiEntryKind, string> = {
			user: 'YOU',
			assistant: 'AI ',
			system: 'SYS',
			error: 'ERR',
		};

		const plainPrefix = `[${labels[entry.kind]}] `;
		const wrapped = this.wrapText(
			entry.text.length > 0 ? entry.text : '(streaming...)',
			width - plainPrefix.length,
		);

		const coloredPrefix =
			entry.kind === 'user'
				? picocolors.cyan(plainPrefix)
				: entry.kind === 'assistant'
					? picocolors.blue(plainPrefix)
					: entry.kind === 'error'
						? picocolors.red(plainPrefix)
						: picocolors.dim(plainPrefix);

		return wrapped.map((line, index) =>
			index === 0 ? `${coloredPrefix}${line}` : `${' '.repeat(plainPrefix.length)}${line}`,
		);
	}

	private wrapText(text: string, width: number): string[] {
		const safeWidth = Math.max(20, width);
		const lines: string[] = [];
		for (const paragraph of text.split('\n')) {
			let remaining = paragraph;
			if (remaining.length === 0) {
				lines.push('');
				continue;
			}

			while (remaining.length > safeWidth) {
				let boundary = remaining.lastIndexOf(' ', safeWidth);
				if (boundary <= 0) boundary = safeWidth;
				lines.push(remaining.slice(0, boundary));
				remaining = remaining.slice(boundary).trimStart();
			}
			lines.push(remaining);
		}

		return lines;
	}

	private readPayloadString(payload: unknown, key: string): string | null {
		if (!payload || typeof payload !== 'object') return null;
		const value = Reflect.get(payload, key);
		return typeof value === 'string' ? value : null;
	}

	private trimToWidth(text: string, width: number): string {
		if (width <= 0) return '';
		if (text.length <= width) return text;
		if (width <= 3) return text.slice(0, width);
		return `${text.slice(0, width - 3)}...`;
	}
}
