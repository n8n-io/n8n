import type { HarnessV1SandboxProvider } from '@ai-sdk/harness';
import {
	HarnessAgent,
	type HarnessAgentAdapter,
	type HarnessAgentSandboxConfig,
} from '@ai-sdk/harness/agent';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import type {
	AgentMessage,
	AgentRuntimeInstance,
	AgentRunState,
	BuiltTool,
	ExecutionOptions,
	ResumeOptions,
	RunOptions,
	SerializableAgentState,
	StreamResult,
} from '../types';
import { HarnessSessionExpiredError } from './n8n-sandbox-provider';
import type { HarnessSessionClaim, HarnessSessionStore } from './session-store';
import {
	chainHarnessStreams,
	translateHarnessStream,
	type HarnessStreamLifecycleEmitter,
} from './stream';
import { toHarnessTools } from './tool-adapter';

export interface HarnessRuntimeAgentSettings {
	name: string;
	model: string;
	instructions: string;
	projectId: string;
	agentId: string;
	runtimeIdentity: string;
	adapter: string;
	harness: HarnessAgentAdapter;
	createSandboxProvider(claim: HarnessSessionClaim): HarnessV1SandboxProvider;
	sessionStore: HarnessSessionStore;
	sessionEndMode?: 'detach' | 'stop';
	tools?: readonly BuiltTool[];
	sandboxConfig?: HarnessAgentSandboxConfig;
}

const EMPTY_MESSAGE_LIST = {
	messages: [],
	historyIds: [],
	inputIds: [],
	responseIds: [],
};

class PreviousHarnessTurnUnfinishedError extends UserError {
	constructor() {
		super('The previous agent turn is still finishing. Try again in a moment.');
	}
}

function getPrompt(input: AgentMessage[] | string): string {
	if (typeof input === 'string') return input;

	for (let index = input.length - 1; index >= 0; index--) {
		const message = input[index];
		if (!('role' in message) || message.role !== 'user') continue;
		if (message.content.some((part) => part.type !== 'text')) {
			throw new UserError('Harness agents do not support file attachments');
		}
		const text = message.content
			.filter((part) => part.type === 'text')
			.map((part) => part.text)
			.join('\n');
		if (text) return text;
	}

	throw new UserError('Harness turns require a user text message');
}

function getSnapshotModel(model: string): { provider: string | null; name: string | null } {
	const separator = model.indexOf('/');
	return separator === -1
		? { provider: null, name: model }
		: { provider: model.slice(0, separator), name: model.slice(separator + 1) };
}

export class HarnessRuntimeAgent implements AgentRuntimeInstance {
	readonly name: string;

	readonly snapshot: { readonly model: { provider: string | null; name: string | null } };

	private readonly tools: BuiltTool[];

	private readonly additionalToolInstructions: string[] = [];

	constructor(private readonly settings: HarnessRuntimeAgentSettings) {
		this.name = settings.name;
		this.snapshot = { model: getSnapshotModel(settings.model) };
		this.tools = [...(settings.tools ?? [])];
	}

	get declaredTools(): readonly BuiltTool[] {
		return this.tools;
	}

	tool(toolOrTools: BuiltTool | readonly BuiltTool[]): this {
		const additions: readonly BuiltTool[] = Array.isArray(toolOrTools)
			? toolOrTools
			: [toolOrTools];
		const names = new Set(this.tools.map((tool) => tool.name));
		for (const tool of additions) {
			if (names.has(tool.name)) {
				throw new UserError(`Agent tool "${tool.name}" is already registered`);
			}
			names.add(tool.name);
			this.tools.push(tool);
			if (tool.systemInstruction) this.additionalToolInstructions.push(tool.systemInstruction);
		}
		return this;
	}

	hasCheckpointStorage(): boolean {
		return false;
	}

	async stream(
		input: AgentMessage[] | string,
		options: RunOptions & ExecutionOptions = {},
	): Promise<StreamResult> {
		const persistence = options.persistence;
		if (!persistence) {
			throw new UnexpectedError('Harness turns require a persisted thread scope');
		}
		const prompt = getPrompt(input);

		const runId = randomUUID();
		let status: AgentRunState = 'running';
		const claim = await this.settings.sessionStore.claim(
			{
				projectId: this.settings.projectId,
				agentId: this.settings.agentId,
				threadId: persistence.threadId,
				resourceId: persistence.resourceId,
				runtimeIdentity: this.settings.runtimeIdentity,
				adapter: this.settings.adapter,
			},
			{ abortSignal: options.abortSignal },
		);
		const abortSignal = options.abortSignal
			? AbortSignal.any([options.abortSignal, claim.abortSignal])
			: claim.abortSignal;
		if (claim.state.resetReason === 'aborted') {
			try {
				await claim.clear();
			} finally {
				await claim.release();
			}
			throw new UserError(
				'The previous agent session was reset after its turn was canceled. Send your message again to start a new session.',
			);
		}

		const pendingLifecycle: Array<Parameters<HarnessStreamLifecycleEmitter['emit']>[0]> = [];
		const lifecycle: HarnessStreamLifecycleEmitter = {
			emit: (chunk) => pendingLifecycle.push(chunk),
		};
		const tools = toHarnessTools(this.tools, {
			runId,
			persistence,
			execution: { ...options, abortSignal },
			emitLifecycle: (chunk) => lifecycle.emit(chunk),
		});
		const agent = new HarnessAgent({
			harness: this.settings.harness,
			sandbox: this.settings.createSandboxProvider(claim),
			instructions: [this.settings.instructions, ...this.additionalToolInstructions].join('\n\n'),
			permissionMode: 'allow-all',
			tools,
			...(this.settings.sandboxConfig ? { sandboxConfig: this.settings.sandboxConfig } : {}),
		});

		let session;
		try {
			session = await agent.createSession({
				sessionId: claim.state.sessionId,
				...(claim.state.resumeFrom ? { resumeFrom: claim.state.resumeFrom } : {}),
				...(claim.state.continueFrom ? { continueFrom: claim.state.continueFrom } : {}),
				abortSignal,
			});
		} catch (error) {
			try {
				if (error instanceof HarnessSessionExpiredError) await claim.clear();
			} finally {
				await claim.release();
			}
			throw error;
		}

		try {
			const result = claim.state.continueFrom
				? await agent.continueStream({
						session,
						abortSignal,
					})
				: await agent.stream({
						session,
						prompt,
						abortSignal,
					});

			const harnessStream = claim.state.continueFrom
				? chainHarnessStreams(result.stream, async () => {
						if (session.hasUnfinishedTurn()) throw new PreviousHarnessTurnUnfinishedError();
						return (
							await agent.stream({
								session,
								prompt,
								abortSignal,
							})
						).stream;
					})
				: result.stream;
			const stream = translateHarnessStream(harnessStream, {
				model: this.settings.model,
				lifecycle,
				onComplete: async () => {
					if (claim.abortSignal.aborted) {
						status = 'failed';
						await claim.release();
						throw claim.abortSignal.reason;
					}
					if (options.abortSignal?.aborted) {
						status = 'cancelled';
						try {
							await this.destroySessionAndMarkReset(session, claim);
						} finally {
							await claim.release();
						}
						return;
					}

					try {
						if (session.hasUnfinishedTurn()) {
							const continueFrom = await session.suspendTurn();
							await claim.save({ sessionId: session.sessionId, continueFrom });
						} else {
							const resumeFrom =
								this.settings.sessionEndMode === 'stop'
									? await session.stop()
									: await session.detach();
							await claim.save({ sessionId: session.sessionId, resumeFrom });
						}
						status = 'success';
					} catch (error) {
						status = 'failed';
						await this.destroySession(session, claim);
						throw error;
					} finally {
						await claim.release();
					}
				},
				onFailure: async (error) => {
					status = options.abortSignal?.aborted ? 'cancelled' : 'failed';
					if (claim.abortSignal.aborted) {
						await claim.release();
						return;
					}
					try {
						if (error instanceof PreviousHarnessTurnUnfinishedError) {
							const continueFrom = await session.suspendTurn();
							await claim.save({ sessionId: session.sessionId, continueFrom });
						} else if (options.abortSignal?.aborted) {
							await this.destroySessionAndMarkReset(session, claim);
						} else {
							await this.destroySession(session, claim);
						}
					} finally {
						await claim.release();
					}
				},
			});
			for (const chunk of pendingLifecycle) lifecycle.emit(chunk);
			pendingLifecycle.length = 0;

			return {
				runId,
				stream,
				getState: () => this.getState(status, options),
			};
		} catch (error) {
			status = options.abortSignal?.aborted ? 'cancelled' : 'failed';
			if (claim.abortSignal.aborted) {
				await claim.release();
				throw error;
			}
			try {
				if (options.abortSignal?.aborted) {
					await this.destroySessionAndMarkReset(session, claim);
				} else {
					await this.destroySession(session, claim);
				}
			} finally {
				await claim.release();
			}
			throw error;
		}
	}

	async resume(
		_method: 'stream',
		_data: unknown,
		_options: ResumeOptions & ExecutionOptions,
	): Promise<StreamResult> {
		await Promise.resolve();
		throw new UserError('Harness host-tool approval continuation is not supported');
	}

	async close(): Promise<void> {}

	private getState(
		status: AgentRunState,
		options: RunOptions & ExecutionOptions,
	): SerializableAgentState {
		return {
			status,
			messageList: EMPTY_MESSAGE_LIST,
			pendingToolCalls: {},
			...(options.persistence ? { persistence: options.persistence } : {}),
		};
	}

	private async destroySession(
		session: { destroy(): Promise<void> },
		claim: HarnessSessionClaim,
	): Promise<void> {
		try {
			await session.destroy();
		} finally {
			await claim.clear();
		}
	}

	private async destroySessionAndMarkReset(
		session: { destroy(): Promise<void> },
		claim: HarnessSessionClaim,
	): Promise<void> {
		await session.destroy();
		await claim.save({ sessionId: claim.state.sessionId, resetReason: 'aborted' });
	}
}
