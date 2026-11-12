import {
	InstanceAiAssistantEvalCreateThreadRequest,
	InstanceAiAssistantEvalThreadOverridesRequest,
	InstanceAiEvalCredentialAllowlistRequest,
	InstanceAiEvalCredentialTestTargetRequest,
	InstanceAiEvalExportExecutionRequest,
	InstanceAiEvalRestoreExecutionRequest,
	InstanceAiEvalSeedDataTableRowsRequest,
} from '@n8n/api-types';
import { AuthenticatedRequest, type User } from '@n8n/db';
import { Body, Delete, GlobalScope, Param, Post, Put, RestController } from '@n8n/decorators';
import { ForbiddenError } from '@n8n/errors';
import type { Response } from 'express';

import { SystemAgentEvalService } from '@/modules/agents/system-agents/system-agent-eval.service';

import { EvalAssistantTurnOverrides } from '../../eval/eval-assistant-turn-overrides';
import { FailedExecutionPortabilityService } from '../../eval/failed-execution-portability.service';
import { EvalThreadCredentialAllowlistService } from '../../eval/thread-credential-allowlist.service';
import { EvalThreadRestoreService } from '../../eval/thread-restore.service';
import { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

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
	) {}

	/** Create the thread before its first message, so the harness can set it up first. */
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
