import {
	InstanceAiEvalExecutionRequest,
	InstanceAiEvalAgentExecutionRequest,
	InstanceAiEvalCredentialAllowlistRequest,
	InstanceAiEvalCredentialTestTargetRequest,
	InstanceAiEvalExportExecutionRequest,
	InstanceAiEvalRestoreExecutionRequest,
	InstanceAiEvalRestoreThreadRequest,
	InstanceAiEvalSeedDataTableRowsRequest,
} from '@n8n/api-types';
import type { InstanceAiEvalThreadMemoryResponse } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Middleware, Param, Post, RestController } from '@n8n/decorators';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { clearedAgentBuilderTargetMetadata, meterEvalUsage } from '@n8n/instance-ai';
import type { NextFunction, Request, Response } from 'express';

import { EvalAgentExecutionService } from './agent-execution.service';
import { EvalExecutionService } from './execution.service';
import { FailedExecutionPortabilityService } from './failed-execution-portability.service';
import { EvalThreadCredentialAllowlistService } from './thread-credential-allowlist.service';
import { EvalThreadRestoreService } from './thread-restore.service';
import { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiService } from '../instance-ai.service';

/**
 * Endpoints for the Instance AI eval harness. The module registers this
 * controller only on an eval instance (`N8N_INSTANCE_AI_EVAL_INSTANCE`), so
 * the routes return 404 on every other instance.
 */
@RestController('/instance-ai')
export class InstanceAiEvalController {
	constructor(
		private readonly instanceAiService: InstanceAiService,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly evalExecutionService: EvalExecutionService,
		private readonly evalAgentExecutionService: EvalAgentExecutionService,
		private readonly evalCredentialAllowlists: EvalThreadCredentialAllowlistService,
		private readonly evalThreadRestore: EvalThreadRestoreService,
		private readonly failedExecutionPortability: FailedExecutionPortabilityService,
	) {}

	// Controller middleware does not cross controllers, so this repeats the
	// Brotli-to-gzip downgrade of `InstanceAiController` for the eval routes.
	// Each kept-alive Brotli stream holds ~8.6 MB of native memory; gzip holds a few KB.
	@Middleware()
	stripBrotli(req: Request, _res: Response, next: NextFunction) {
		const ae = req.headers['accept-encoding'];
		if (typeof ae === 'string' && ae.includes('br')) {
			req.headers['accept-encoding'] = ae.replace(/\bbr\b,?\s*/g, '').replace(/,\s*$/, '');
		}
		next();
	}

	// Runs for minutes; the eval client (N8nClient) disables undici's 300s timeout for it.
	@Post('/eval/execute-with-llm-mock/:workflowId')
	@GlobalScope('instanceAi:manage')
	async executeWithLlmMock(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body payload: InstanceAiEvalExecutionRequest,
	) {
		// The mocks run on the eval model; the caller adds their usage to the case's cost.
		const { result, usage } = await meterEvalUsage(
			async () => await this.evalExecutionService.executeWithLlmMock(workflowId, req.user, payload),
		);
		return { ...result, llmUsage: usage };
	}

	// Runs for minutes; same client timeout handling as the workflow variant.
	@Post('/eval/execute-agent-with-llm-mock/:agentId')
	@GlobalScope('instanceAi:manage')
	async executeAgentWithLlmMock(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: InstanceAiEvalAgentExecutionRequest,
	) {
		const { result, usage } = await meterEvalUsage(
			async () =>
				await this.evalAgentExecutionService.executeWithLlmMock(agentId, req.user, payload),
		);
		return { ...result, llmUsage: usage };
	}

	/**
	 * Pin a build thread's credential view to a declared set. Only narrows:
	 * `list()` results are intersected with these IDs, so the caller cannot see
	 * anything they couldn't already access. The thread must exist — entries are
	 * cleared with the thread's state, so pins for never-created threads would
	 * be uncollectable.
	 */
	@Post('/eval/thread-credential-allowlist')
	@GlobalScope('instanceAi:manage')
	async setThreadCredentialAllowlist(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalCredentialAllowlistRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, payload.threadId);
		this.evalCredentialAllowlists.set(
			payload.threadId,
			payload.credentialIds,
			payload.bypassCredentialTest,
		);
		return { ok: true };
	}

	/**
	 * Send the thread's connection tests for one credential type to a provider
	 * stand-in, so the agent's own test checks the captured secret. The secret
	 * then goes to another host, so only a throwaway eval instance may offer this.
	 */
	@Post('/eval/thread-credential-test-target')
	@GlobalScope('instanceAi:manage')
	async setThreadCredentialTestTarget(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalCredentialTestTargetRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, payload.threadId);
		const { threadId, ...target } = payload;
		this.evalCredentialAllowlists.setTestTarget(threadId, target);
		return { ok: true };
	}

	/**
	 * Observational memory for a thread, for a context eval to assert on.
	 *
	 * Returns the observation text, an LLM-written summary of the user's conversation.
	 * Gated like every other `/eval/` route: eval instances only, `instanceAi:manage`
	 * (owner/admin by default), and `assertThreadAccess` keeps a caller to threads
	 * they can already read in full.
	 */
	@Get('/eval/threads/:threadId/memory')
	@GlobalScope('instanceAi:manage')
	async getEvalThreadMemory(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<InstanceAiEvalThreadMemoryResponse> {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return await this.instanceAiService.getThreadMemory(req.user.id, threadId);
	}

	/** Export one failed execution of a thread's project as a portable envelope. */
	@Post('/eval/export-execution')
	@GlobalScope('instanceAi:manage')
	async exportExecution(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalExportExecutionRequest,
	) {
		this.requireInstanceAiEnabled();
		const projectId = await this.threadProjectId(req.user.id, payload.threadId);
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
		const projectId = await this.threadProjectId(req.user.id, payload.threadId);
		return await this.failedExecutionPortability.restoreExecution(
			req.user,
			projectId,
			payload.workflowId,
			payload.envelope,
		);
	}

	private async threadProjectId(userId: string, threadId: string): Promise<string> {
		await this.assertThreadAccess(userId, threadId);
		const projectId = await this.memoryService.getThreadProjectId(threadId);
		if (!projectId) throw new BadRequestError('Thread is not bound to a project');
		return projectId;
	}

	/**
	 * Seed an existing (owned) thread with a previously exported conversation:
	 * recreate the artifacts the history references — workflows (node credentials
	 * resolved against the project's — see `EvalThreadRestoreService`), data tables
	 * and agents — publish the workflows the seed flags `published`, then write the
	 * native message log verbatim. The thread then continues as if the
	 * conversation really happened, so an eval can drive the next turn live.
	 */
	@Post('/eval/restore-thread')
	@GlobalScope('instanceAi:manage')
	async restoreEvalThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalRestoreThreadRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, payload.threadId);
		const projectId = await this.memoryService.getThreadProjectId(payload.threadId);
		if (!projectId) {
			throw new BadRequestError('Thread is not bound to a project');
		}

		// Seed node credentials resolve within the thread's pinned credential view,
		// so a same-named credential of a concurrent case is never picked.
		const allowedCredentialIds = this.evalCredentialAllowlists.get(payload.threadId);
		// Artifacts and publish come BEFORE the binding and the messages: the service
		// rolls its own partial work back, and the messages cannot be rolled back.
		const seed = await this.evalThreadRestore.restoreSeedArtifacts(
			payload,
			projectId,
			req.user,
			allowedCredentialIds ? new Set(allowedCredentialIds) : undefined,
		);
		let restored = 0;
		// Captured so the binding write is undoable: the message write happens after
		// it, and without this a message failure left a binding pointing at agents the
		// rollback had already deleted.
		let priorMetadata: Record<string, unknown> | undefined;
		let bindingWritten = false;
		try {
			// Bind the thread as the conversation that built these agents would have, or
			// the live turn's first `agent_builder_build_agent` call is rejected as an unknown agentRef.
			// BEFORE the messages, and undoable: the catch restores the prior metadata,
			// so a message failure can't leave a binding pointing at deleted agents, and
			// a binding failure can't leave messages referencing them.
			if (seed.agentBuilderBinding) {
				priorMetadata = await this.memoryService.getThreadMetadata(req.user.id, payload.threadId);
				await this.memoryService.updateThread(payload.threadId, {
					metadata: seed.agentBuilderBinding,
				});
				bindingWritten = true;
			}
			// A data-table-only seed (TRUST-311) sends no messages — skip the write.
			if (payload.messages.length > 0) {
				({ restored } = await this.memoryService.restoreThreadMessages(
					req.user.id,
					payload.threadId,
					payload.messages,
				));
			}
		} catch (error) {
			if (bindingWritten) {
				try {
					// `updateThread` MERGES, so the prior snapshot alone would leave the
					// binding keys standing — this names them and restores each.
					await this.memoryService.updateThread(payload.threadId, {
						metadata: clearedAgentBuilderTargetMetadata(priorMetadata),
					});
				} catch {
					// Best-effort, like the artifact deletes: never throw over the failure
					// that triggered the rollback.
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

	/**
	 * Reset an existing data table's rows to exactly the supplied set
	 * (clear-then-insert). The eval harness pre-creates a case's scenario data
	 * tables empty before the build turn (so the agent binds the real table id),
	 * then calls this per scenario to swap in that scenario's rows (TRUST-311
	 * follow-up). Auth + project scoping mirror restore-thread: the table must be
	 * in the thread's project.
	 */
	@Post('/eval/seed-data-table-rows')
	@GlobalScope('instanceAi:manage')
	async seedEvalDataTableRows(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalSeedDataTableRowsRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, payload.threadId);
		const projectId = await this.memoryService.getThreadProjectId(payload.threadId);
		if (!projectId) {
			throw new BadRequestError('Thread is not bound to a project');
		}
		await this.evalThreadRestore.reseedDataTableRows(payload.tableId, projectId, payload.rows);
		return { ok: true, tableId: payload.tableId, rowCount: payload.rows.length };
	}

	private requireInstanceAiEnabled(): void {
		if (!this.settingsService.isInstanceAiEnabled()) {
			throw new ForbiddenError('Instance AI is disabled');
		}
	}

	private async assertThreadAccess(userId: string, threadId: string): Promise<void> {
		const ownership = await this.memoryService.checkThreadOwnership(userId, threadId);
		if (ownership === 'other_user') {
			throw new ForbiddenError('Not authorized for this thread');
		}
		if (ownership === 'not_found') {
			throw new NotFoundError('Thread not found');
		}
	}
}
