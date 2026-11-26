import type { BuiltTool } from '@n8n/agents';
import type { AgentTestRunCommitActionResult, AgentTestRunCommitResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { redactText } from '@n8n/utils/redaction/redact-text';

import { userHasScopes } from '@/permissions.ee/check-access';
import { isPolicyRefusal } from '@/policy/policy-violation.error';

import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { hashAgentSandboxPrincipal } from '../agent-sandbox-principal';
import { draftChatMemoryResourceId } from '../utils/agent-memory-scope';
import type { HeldActionDescriptor } from './simulation-session';
import { SimulationSessionService } from './simulation-session.service';

const MAX_SAFE_ERROR_LENGTH = 500;

const DEFAULT_ERROR_MESSAGE = 'Action execution failed.';

const ALREADY_FAILED_PREFIX =
	'This action failed earlier and did not run again, because the service may have received it.';

export interface CommitHeldActionsInput {
	agentId: string;
	projectId: string;
	user: User;
	testChatId: string;
	executionId?: string;
	actionIds: string[];
}

interface PendingCommitItem {
	index: number;
	action: HeldActionDescriptor;
}

/**
 * Replays held write actions from a test chat once against the agent's real built tools.
 * Enforces session ownership and an idempotent one-shot guard so no action executes twice.
 * A replay that started and failed does not run again: the service may have accepted the write.
 */
@Service()
export class HeldActionCommitService {
	constructor(
		private readonly logger: Logger,
		private readonly simulationSessions: SimulationSessionService,
		private readonly runtimeCache: AgentRuntimeCacheService,
	) {}

	async commitHeldActions(input: CommitHeldActionsInput): Promise<AgentTestRunCommitResponse> {
		// The replay runs the unpublished draft, so it needs `agent:read` like a draft test run.
		if (!(await userHasScopes(input.user, ['agent:read'], false, { projectId: input.projectId }))) {
			throw new ForbiddenError('You do not have permission to run the draft of this agent.');
		}

		const session = this.simulationSessions.getSession({
			userId: input.user.id,
			projectId: input.projectId,
			agentId: input.agentId,
			testChatId: input.testChatId,
		});
		if (!session) {
			throw new NotFoundError('Test chat session not found.');
		}

		const committedAt = new Date().toISOString();
		const results: (AgentTestRunCommitActionResult | undefined)[] = Array.from(
			{ length: input.actionIds.length },
			() => undefined,
		);
		const pending: PendingCommitItem[] = [];

		for (const [index, actionId] of input.actionIds.entries()) {
			const claim = session.beginCommitAction(actionId);
			if (claim.status === 'already_committed') {
				results[index] = {
					actionId,
					toolName: claim.action.toolName,
					status: 'already_committed',
				};
				continue;
			}
			if (claim.status === 'already_failed') {
				results[index] = {
					actionId,
					toolName: claim.action.toolName,
					status: 'failed',
					error: `${ALREADY_FAILED_PREFIX} ${claim.action.error ?? DEFAULT_ERROR_MESSAGE}`,
				};
				continue;
			}
			if (claim.status === 'not_found') {
				results[index] = {
					actionId,
					toolName: 'unknown',
					status: 'failed',
					error: 'Held action not found in this test chat.',
				};
				continue;
			}
			pending.push({ index, action: claim.action });
		}

		if (pending.length > 0) {
			let runtime;
			try {
				// Build or lease the live draft runtime without simulation hooks.
				runtime = await this.runtimeCache.getRuntime({
					agentId: input.agentId,
					projectId: input.projectId,
					user: input.user,
					usePublishedVersion: false,
					// The sandbox scope of the test chat. A sandboxed runtime does not build without it.
					sandboxPrincipalHash: hashAgentSandboxPrincipal({
						type: 'test-chat',
						userId: input.user.id,
						threadId: input.testChatId,
					}),
				});
			} catch (error) {
				for (const item of pending) {
					session.abortCommitAction(item.action.actionId);
				}
				throw error;
			}

			try {
				let toolsByName: Map<string, BuiltTool>;
				try {
					// MCP tools are not declared tools: the agent lists them from its MCP clients.
					const mcpTools = await runtime.agent.listMcpTools();
					toolsByName = new Map(
						[...runtime.agent.declaredTools, ...mcpTools].map((tool) => [tool.name, tool]),
					);
				} catch (error) {
					for (const item of pending) {
						session.abortCommitAction(item.action.actionId);
					}
					throw error;
				}

				for (const item of pending) {
					const { action, index } = item;
					const tool = toolsByName.get(action.toolName);
					if (!tool?.handler) {
						session.abortCommitAction(action.actionId);
						results[index] = {
							actionId: action.actionId,
							toolName: action.toolName,
							status: 'failed',
							error: 'Tool is no longer available on this agent.',
						};
						continue;
					}

					try {
						const output = await tool.handler(action.input, {
							toolCallId: action.actionId,
							toolName: action.toolName,
							...(input.executionId ? { runId: input.executionId } : {}),
							// The test chat thread, so file inputs and outputs resolve as in the chat.
							persistence: {
								threadId: input.testChatId,
								resourceId: draftChatMemoryResourceId(input.user.id),
							},
						});
						// A policy refusal is returned, not thrown. Nothing was sent, so release the claim.
						if (isPolicyRefusal(output)) {
							session.abortCommitAction(action.actionId);
							results[index] = {
								actionId: action.actionId,
								toolName: action.toolName,
								status: 'failed',
								error: toSafeErrorMessage(
									isRecord(output) && typeof output.message === 'string' ? output.message : '',
								),
							};
							continue;
						}
						session.completeCommitAction(action.actionId, committedAt);
						results[index] = {
							actionId: action.actionId,
							toolName: action.toolName,
							status: 'done',
						};
					} catch (error) {
						const safeError = toSafeErrorMessage(error);
						// The handler can reject after the service accepted the write, for example on a
						// response timeout. Keep the claim, so a retry cannot send the write twice.
						session.failCommitAction(action.actionId, new Date().toISOString(), safeError);
						this.logger.warn('[SafeTesting] Held action replay failed', {
							agentId: input.agentId,
							testChatId: input.testChatId,
							actionId: action.actionId,
							toolName: action.toolName,
							error: safeError,
						});
						results[index] = {
							actionId: action.actionId,
							toolName: action.toolName,
							status: 'failed',
							error: safeError,
						};
					}
				}
			} finally {
				this.runtimeCache.releaseRuntimeLease(runtime.agent);
			}
		}

		return {
			committedAt,
			results: results.filter(
				(result): result is AgentTestRunCommitActionResult => result !== undefined,
			),
		};
	}
}

function toSafeErrorMessage(error: unknown): string {
	const raw =
		error instanceof Error
			? error.message
			: typeof error === 'string'
				? error
				: DEFAULT_ERROR_MESSAGE;
	const firstLine = raw.split('\n')[0]?.trim() ?? '';
	const message = firstLine.length > 0 ? firstLine : DEFAULT_ERROR_MESSAGE;
	const redacted = redactText(message).text;
	return redacted.length > MAX_SAFE_ERROR_LENGTH
		? `${redacted.slice(0, MAX_SAFE_ERROR_LENGTH)}...`
		: redacted;
}
