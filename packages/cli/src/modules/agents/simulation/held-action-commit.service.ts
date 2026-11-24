import type { BuiltTool } from '@n8n/agents';
import type { AgentTestRunCommitActionResult, AgentTestRunCommitResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { redactText } from '@n8n/utils/redaction/redact-text';

import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { HeldActionDescriptor } from './simulation-session';
import { SimulationSessionService } from './simulation-session.service';

const MAX_SAFE_ERROR_LENGTH = 500;

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
 */
@Service()
export class HeldActionCommitService {
	constructor(
		private readonly logger: Logger,
		private readonly simulationSessions: SimulationSessionService,
		private readonly runtimeCache: AgentRuntimeCacheService,
	) {}

	async commitHeldActions(input: CommitHeldActionsInput): Promise<AgentTestRunCommitResponse> {
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
				});
			} catch (error) {
				for (const item of pending) {
					session.abortCommitAction(item.action.actionId);
				}
				throw error;
			}

			try {
				const toolsByName = new Map<string, BuiltTool>(
					runtime.agent.declaredTools.map((tool) => [tool.name, tool]),
				);

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
						await tool.handler(action.input, {
							toolCallId: action.actionId,
							toolName: action.toolName,
							...(input.executionId ? { runId: input.executionId } : {}),
						});
						session.completeCommitAction(action.actionId, committedAt);
						results[index] = {
							actionId: action.actionId,
							toolName: action.toolName,
							status: 'done',
						};
					} catch (error) {
						session.abortCommitAction(action.actionId);
						const safeError = toSafeErrorMessage(error);
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
				: 'Action execution failed.';
	const firstLine = raw.split('\n')[0]?.trim() ?? '';
	const message = firstLine.length > 0 ? firstLine : 'Action execution failed.';
	const redacted = redactText(message).text;
	return redacted.length > MAX_SAFE_ERROR_LENGTH
		? `${redacted.slice(0, MAX_SAFE_ERROR_LENGTH)}...`
		: redacted;
}
