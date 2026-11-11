import {
	InstanceAiAssistantEvalCreateThreadRequest,
	InstanceAiAssistantEvalThreadOverridesRequest,
	InstanceAiEvalCredentialAllowlistRequest,
	InstanceAiEvalCredentialTestTargetRequest,
	InstanceAiEvalExportExecutionRequest,
	InstanceAiEvalRestoreExecutionRequest,
	InstanceAiEvalRestoreThreadRequest,
	InstanceAiEvalSeedDataTableRowsRequest,
} from '@n8n/api-types';
import { AuthenticatedRequest, type User } from '@n8n/db';
import { Body, Delete, GlobalScope, Param, Post, Put, RestController } from '@n8n/decorators';
import { ForbiddenError } from '@n8n/errors';
import { clearedAgentBuilderTargetMetadata } from '@n8n/instance-ai';
import type { Response } from 'express';

import { SystemAgentEvalService } from '@/modules/agents/system-agents/system-agent-eval.service';
import { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import { ASSISTANT_AGENT_ID } from '../assistant-agent/assistant-turn-options';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { toRestorableMessages } from '../restorable-messages';
import { EvalAssistantTurnOverrides } from './eval-assistant-turn-overrides';
import { FailedExecutionPortabilityService } from './failed-execution-portability.service';
import { EvalThreadCredentialAllowlistService } from './thread-credential-allowlist.service';
import { EvalThreadRestoreService } from './thread-restore.service';

/**
 * Eval harness routes for Assistant agent threads. The module loads this
 * controller only on an eval instance where the Assistant agent registers,
 * so the routes return 404 on every other instance.
 *
 * Each thread route loads the thread through the system-agent runtime. It
 * rejects a thread that the caller does not own or can no longer use.
 */
@RestController('/assistant')
export class AssistantAgentEvalController {
	constructor(
		private readonly settingsService: InstanceAiSettingsService,
		private readonly systemAgentEval: SystemAgentEvalService,
		private readonly turnOverrides: EvalAssistantTurnOverrides,
		private readonly credentialAllowlists: EvalThreadCredentialAllowlistService,
		private readonly evalThreadRestore: EvalThreadRestoreService,
		private readonly failedExecutionPortability: FailedExecutionPortabilityService,
		private readonly threadMetadata: SystemAgentThreadMetadataService,
	) {}

	/**
	 * Create the thread before its first message, so the harness can set it up
	 * first. Store the given provenance in the thread metadata.
	 */
	@Post('/eval/threads')
	@GlobalScope('instanceAi:manage')
	async createThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiAssistantEvalCreateThreadRequest,
	) {
		this.requireInstanceAiEnabled();
		const thread = await this.systemAgentEval.createThread({
			agentId: ASSISTANT_AGENT_ID,
			user: req.user,
			projectId: payload.projectId,
			threadId: payload.threadId,
		});
		const { source, sourceContext } = payload;
		if (source !== undefined || sourceContext !== undefined) {
			// The trace of each turn reads the provenance from the thread metadata.
			// The metadata needs the memory row, which comes with the first turn.
			await this.systemAgentEval.ensureMemoryThread(ASSISTANT_AGENT_ID, req.user, thread.id);
			await this.threadMetadata.patch(ASSISTANT_AGENT_ID, req.user, thread.id, (metadata) => ({
				...metadata,
				...(source !== undefined ? { source } : {}),
				...(sourceContext !== undefined ? { sourceContext } : {}),
			}));
		}
		return { threadId: thread.id, projectId: thread.projectId };
	}

	@Delete('/eval/threads/:threadId')
	@GlobalScope('instanceAi:manage')
	async deleteThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		this.requireInstanceAiEnabled();
		await this.systemAgentEval.deleteThread(ASSISTANT_AGENT_ID, req.user, threadId);
		// Clear only after the delete, which checks that the caller owns the thread.
		this.turnOverrides.clearThread(threadId);
		return { ok: true };
	}

	/** Replace the turn overrides of the thread. An omitted field clears its override. */
	@Put('/eval/threads/:threadId/overrides')
	@GlobalScope('instanceAi:manage')
	async setThreadOverrides(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: InstanceAiAssistantEvalThreadOverridesRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.getThread(req.user, threadId);
		this.turnOverrides.setThreadOverrides(threadId, payload);
		return { ok: true };
	}

	/**
	 * Pin the credential view of the thread to a declared set. The set only
	 * narrows what the caller can already see. The thread must exist, because
	 * the delete route clears the entries with the thread.
	 */
	@Post('/eval/thread-credential-allowlist')
	@GlobalScope('instanceAi:manage')
	async setThreadCredentialAllowlist(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalCredentialAllowlistRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.getThread(req.user, payload.threadId);
		this.credentialAllowlists.set(
			payload.threadId,
			payload.credentialIds,
			payload.bypassCredentialTest,
		);
		return { ok: true };
	}

	/** Send the connection tests of one credential type to a provider stand-in. */
	@Post('/eval/thread-credential-test-target')
	@GlobalScope('instanceAi:manage')
	async setThreadCredentialTestTarget(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalCredentialTestTargetRequest,
	) {
		this.requireInstanceAiEnabled();
		const { threadId, ...target } = payload;
		await this.getThread(req.user, threadId);
		this.credentialAllowlists.setTestTarget(threadId, target);
		return { ok: true };
	}

	/** Export one failed execution of the thread's project as a portable envelope. */
	@Post('/eval/export-execution')
	@GlobalScope('instanceAi:manage')
	async exportExecution(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalExportExecutionRequest,
	) {
		this.requireInstanceAiEnabled();
		const { projectId } = await this.getThread(req.user, payload.threadId);
		return await this.failedExecutionPortability.exportExecution(
			req.user,
			projectId,
			payload.executionId,
		);
	}

	/** Restore an exported failed execution onto a seeded workflow of the thread's project. */
	@Post('/eval/restore-execution')
	@GlobalScope('instanceAi:manage')
	async restoreExecution(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalRestoreExecutionRequest,
	) {
		this.requireInstanceAiEnabled();
		const { projectId } = await this.getThread(req.user, payload.threadId);
		return await this.failedExecutionPortability.restoreExecution(
			req.user,
			projectId,
			payload.workflowId,
			payload.envelope,
		);
	}

	/**
	 * Start the thread mid-conversation: recreate the artifacts of the seed,
	 * then write its earlier messages. The steps run in the order of the
	 * restore route of the current runtime.
	 */
	@Post('/eval/restore-thread')
	@GlobalScope('instanceAi:manage')
	async restoreThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalRestoreThreadRequest,
	) {
		this.requireInstanceAiEnabled();
		const { projectId } = await this.getThread(req.user, payload.threadId);
		// Seed node credentials resolve within the pinned credential view of the thread.
		const allowedCredentialIds = this.credentialAllowlists.get(payload.threadId);
		// Check the messages first, so a bad seed creates no artifacts.
		const messages = toRestorableMessages(payload.messages);
		// The service rolls back its own partial work. The steps below cannot roll
		// back the messages, so they come last.
		const seed = await this.evalThreadRestore.restoreSeedArtifacts(
			payload,
			projectId,
			req.user,
			allowedCredentialIds ? new Set(allowedCredentialIds) : undefined,
		);
		let restored = 0;
		// Kept so that a failed message write can undo the binding.
		let priorMetadata: Record<string, unknown> | undefined;
		let bindingWritten = false;
		try {
			if (seed.agentBuilderBinding || messages.length > 0) {
				// The memory row comes with the first turn. The binding and the messages need it now.
				await this.systemAgentEval.ensureMemoryThread(
					ASSISTANT_AGENT_ID,
					req.user,
					payload.threadId,
				);
			}
			// Bind the seeded agents, or the live turn rejects their refs as unknown agents.
			if (seed.agentBuilderBinding) {
				const binding = seed.agentBuilderBinding;
				await this.threadMetadata.patch(
					ASSISTANT_AGENT_ID,
					req.user,
					payload.threadId,
					(metadata) => {
						priorMetadata = metadata;
						return { ...metadata, ...binding };
					},
				);
				bindingWritten = true;
			}
			// A data-table-only seed sends no messages.
			if (messages.length > 0) {
				await this.systemAgentEval.saveMessages(
					ASSISTANT_AGENT_ID,
					req.user,
					payload.threadId,
					messages,
				);
				restored = messages.length;
			}
		} catch (error) {
			if (bindingWritten) {
				try {
					// Put the binding keys back to their prior values. An absent key drops out of the stored JSON.
					await this.threadMetadata.patch(
						ASSISTANT_AGENT_ID,
						req.user,
						payload.threadId,
						(metadata) => ({ ...metadata, ...clearedAgentBuilderTargetMetadata(priorMetadata) }),
					);
				} catch {
					// Best-effort: do not hide the error that caused the rollback.
				}
			}
			await seed.rollback();
			throw error;
		}
		return {
			ok: true,
			threadId: payload.threadId,
			restored,
			workflowIds: seed.workflowIds,
			dataTableIds: seed.dataTableIds,
			agentIds: seed.agentIds,
			folderIds: seed.folderIds,
		};
	}

	/** Reset the rows of an existing data table in the thread's project. */
	@Post('/eval/seed-data-table-rows')
	@GlobalScope('instanceAi:manage')
	async seedDataTableRows(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalSeedDataTableRowsRequest,
	) {
		this.requireInstanceAiEnabled();
		const { projectId } = await this.getThread(req.user, payload.threadId);
		await this.evalThreadRestore.reseedDataTableRows(payload.tableId, projectId, payload.rows);
		return { ok: true, tableId: payload.tableId, rowCount: payload.rows.length };
	}

	private requireInstanceAiEnabled(): void {
		if (!this.settingsService.isInstanceAiEnabled()) {
			throw new ForbiddenError('Instance AI is disabled');
		}
	}

	/** The thread, when the caller owns it and can use it. Otherwise it throws `NotFoundError`. */
	private async getThread(user: User, threadId: string) {
		return await this.systemAgentEval.getUsableThread(ASSISTANT_AGENT_ID, user, threadId);
	}
}
