import {
	InstanceAiGatewayCapabilitiesDto,
	InstanceAiGatewayCreateCredentialDto,
	InstanceAiFilesystemResponseDto,
	InstanceAiRenameThreadRequestDto,
	InstanceAiThreadTabsRequestDto,
	instanceAiGatewayKeySchema,
	InstanceAiEnsureThreadRequest,
	InstanceAiPersistPendingAgentRequest,
	InstanceAiThreadHistoryQuery,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiVerifyModelRequest,
	InstanceAiVerifySandboxRequest,
	InstanceAiVerifySearchRequest,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiEvalExecutionRequest,
	InstanceAiEvalAgentExecutionRequest,
	InstanceAiEvalCredentialAllowlistRequest,
	InstanceAiEvalRestoreThreadRequest,
	InstanceAiEvalSeedDataTableRowsRequest,
	findSeedFolderIssues,
	findUnbackedSeedWorkflowTools,
} from '@n8n/api-types';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiEvalThreadMemoryResponse,
	InstanceAiThreadTabsResponse,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	RestController,
	GlobalScope,
	Middleware,
	Get,
	Post,
	Put,
	Patch,
	Delete,
	OnPubSubEvent,
	Param,
	Body,
	Query,
} from '@n8n/decorators';
import {
	clearedAgentBuilderTargetMetadata,
	seedAgentBuilderTargetMetadata,
} from '@n8n/instance-ai';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { InstanceAiBrowserSessionService } from './browser/instance-ai-browser-session.service';
import { EvalAgentExecutionService } from './eval/agent-execution.service';
import { EvalExecutionService } from './eval/execution.service';
import { EvalThreadCredentialAllowlistService } from './eval/thread-credential-allowlist.service';
import { EvalThreadRestoreService } from './eval/thread-restore.service';
import { InstanceAiErrorReporterService } from './instance-ai-error-reporter.service';
import { InstanceAiGatewayService } from './instance-ai-gateway.service';
import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiModelCatalogService } from './instance-ai-model-catalog.service';
import { InstanceAiPendingAgentService } from './instance-ai-pending-agent.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiThreadTabsService } from './instance-ai-thread-tabs.service';
import { InstanceAiVerificationService } from './instance-ai-verification.service';
import { InstanceAiService } from './instance-ai.service';
import { InstanceAiOnboardingService, } from './onboarding';
import { CredentialsService } from '@/credentials/credentials.service';

import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { ProjectService } from '@/services/project.service.ee';
import { UrlService } from '@n8n/backend-services';

type FlushableResponse = Response & { flush?: () => void };

const KEEP_ALIVE_INTERVAL_MS = 15_000;

@RestController('/instance-ai')
export class InstanceAiController {
	private readonly gatewayApiKey: string;

	constructor(
		private readonly instanceAiService: InstanceAiService,
		private readonly gatewayService: InstanceAiGatewayService,
		private readonly browserSessionService: InstanceAiBrowserSessionService,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly onboarding: InstanceAiOnboardingService,
		private readonly pendingAgentService: InstanceAiPendingAgentService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly modelCatalogService: InstanceAiModelCatalogService,
		private readonly evalExecutionService: EvalExecutionService,
		private readonly evalAgentExecutionService: EvalAgentExecutionService,
		private readonly evalCredentialAllowlists: EvalThreadCredentialAllowlistService,
		private readonly evalThreadRestore: EvalThreadRestoreService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly push: Push,
		private readonly urlService: UrlService,
		private readonly userRepository: UserRepository,
		private readonly credentialsService: CredentialsService,
		private readonly projectService: ProjectService,
		private readonly instanceAiErrorReporter: InstanceAiErrorReporterService,
		private readonly publisher: Publisher,
		globalConfig: GlobalConfig,
		private readonly threadTabsService: InstanceAiThreadTabsService,
	) {
		this.gatewayApiKey = globalConfig.instanceAi.gatewayApiKey;
	}

	private requireInstanceAiEnabled(): void {
		if (!this.settingsService.isInstanceAiEnabled()) {
			throw new ForbiddenError('Instance AI is disabled');
		}
	}

	// Each BrotliCompress stream allocates ~8.6 MB of native memory for its
	// dictionary, and the compression middleware retains streams via closures on
	// the response object for the lifetime of the HTTP keep-alive connection.
	// Downgrade to gzip (~few KB per stream) for all instance-ai endpoints.
	@Middleware()
	stripBrotli(req: Request, _res: Response, next: NextFunction) {
		const ae = req.headers['accept-encoding'];
		if (typeof ae === 'string' && ae.includes('br')) {
			req.headers['accept-encoding'] = ae.replace(/\bbr\b,?\s*/g, '').replace(/,\s*$/, '');
		}
		next();
	}

	// ── Preference card (the save_user_preference result in the chat) ────────
	//
	// The thread check is the ownership boundary. The row check is inside
	// AiPreferenceService. The runId and the toolCallId are not verified against
	// the log on purpose, and the check would cost a log read on every click.
	// The fold ignores preference-card facts when it anchors a turn, so a wrong
	// pair can only mis-render that one card's state in the caller's own thread.

	// ── Credits ──────────────────────────────────────────────────────────────

	@Get('/credits')
	@GlobalScope('instanceAi:message')
	async getCredits(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		return await this.instanceAiService.getCredits(req.user);
	}

	// ── Admin settings (owner/admin only) ──────────────────────────────────

	@Get('/settings')
	@GlobalScope('instanceAi:manage')
	async getAdminSettings(_req: AuthenticatedRequest) {
		return await this.settingsService.getAdminSettings();
	}

	@Get('/settings/models')
	@GlobalScope('instanceAi:manage')
	async getModelCatalog(_req: AuthenticatedRequest) {
		return await this.modelCatalogService.getModels();
	}

	@Put('/settings')
	@GlobalScope('instanceAi:manage')
	async updateAdminSettings(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiAdminSettingsUpdateRequest,
	) {
		const result = await this.settingsService.updateAdminSettings(payload, req.user);
		const [publishResult] = await Promise.allSettled([
			this.publisher.publishCommand({ command: 'reload-instance-ai-settings' }),
			this.applyAdminSettingsSideEffects(result),
		]);

		if (publishResult.status === 'rejected') {
			this.instanceAiErrorReporter.report(publishResult.reason, {
				component: 'settings-publish',
				threadId: 'admin-settings',
			});
		}

		return result;
	}

	@Post('/settings/verify/model')
	@GlobalScope('instanceAi:manage')
	async verifyModel(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiVerifyModelRequest,
	) {
		return await Container.get(InstanceAiVerificationService).verifyModel(req.user, payload);
	}

	@Post('/settings/verify/sandbox')
	@GlobalScope('instanceAi:manage')
	async verifySandbox(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiVerifySandboxRequest,
	) {
		return await Container.get(InstanceAiVerificationService).verifySandbox(req.user, payload);
	}

	@Post('/settings/verify/search')
	@GlobalScope('instanceAi:manage')
	async verifySearch(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiVerifySearchRequest,
	) {
		return await Container.get(InstanceAiVerificationService).verifySearch(payload);
	}

	@OnPubSubEvent('reload-instance-ai-settings', { instanceType: 'main' })
	async reloadAdminSettings() {
		await this.settingsService.reloadFromDb();
		await this.applyAdminSettingsSideEffects({
			enabled: this.settingsService.isInstanceAiEnabled(),
			browserUseEnabled: this.settingsService.isBrowserUseEnabled(),
			localGatewayDisabled: this.settingsService.isLocalGatewayDisabled(),
		});
	}

	private async applyAdminSettingsSideEffects(
		settings: Pick<
			InstanceAiAdminSettingsResponse,
			'enabled' | 'browserUseEnabled' | 'localGatewayDisabled'
		>,
	) {
		const sideEffects: Array<() => Promise<void> | void> = [
			async () => {
				await this.moduleRegistry.refreshModuleSettings('instance-ai');
			},
			async () => {
				await this.moduleRegistry.refreshModuleSettings('agents');
			},
		];
		if (!settings.enabled || !settings.browserUseEnabled) {
			sideEffects.push(async () => await this.browserSessionService.shutdown());
		}

		if (!settings.enabled || settings.localGatewayDisabled) {
			sideEffects.push(() => {
				const disconnectedUserIds = this.gatewayService.disconnectAllGateways();
				if (disconnectedUserIds.length === 0) return;
				this.push.sendToUsers(
					{
						type: 'instanceAiGatewayStateChanged',
						data: {
							connected: false,
							directory: null,
							hostIdentifier: null,
							toolCategories: [],
						},
					},
					disconnectedUserIds,
				);
			});
		}

		const results = await Promise.allSettled(sideEffects.map(async (apply) => await apply()));
		for (const result of results) {
			if (result.status === 'rejected') {
				this.instanceAiErrorReporter.report(result.reason, {
					component: 'settings-side-effects',
					threadId: 'admin-settings',
				});
			}
		}
	}

	// ── User preferences (per-user, self-service) ──────────────────────────

	@Get('/preferences')
	@GlobalScope('instanceAi:message')
	async getUserPreferences(req: AuthenticatedRequest) {
		return await this.settingsService.getUserPreferences(req.user);
	}

	@Put('/preferences')
	@GlobalScope('instanceAi:message')
	async updateUserPreferences(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiUserPreferencesUpdateRequest,
	) {
		const result = await this.settingsService.updateUserPreferences(req.user, payload);
		if (payload.localGatewayDisabled !== undefined) {
			await this.moduleRegistry.refreshModuleSettings('instance-ai');
		}
		return result;
	}

	@Get('/settings/service-credentials')
	@GlobalScope('instanceAi:manage')
	async listServiceCredentials(_req: AuthenticatedRequest) {
		return await this.settingsService.listInstanceServiceCredentials();
	}

	@Get('/settings/model-credentials')
	@GlobalScope('instanceAi:manage')
	async listInstanceModelCredentials(_req: AuthenticatedRequest) {
		return await this.settingsService.listInstanceModelCredentials();
	}

	@Get('/threads')
	@GlobalScope('instanceAi:message')
	async listThreads(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		return await this.memoryService.listThreads(req.user.id);
	}

	@Get('/threads/history')
	@GlobalScope('instanceAi:message')
	async listThreadHistory(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: InstanceAiThreadHistoryQuery,
	) {
		this.requireInstanceAiEnabled();
		return await this.memoryService.listThreadHistory(req.user.id, query);
	}

	@Get('/threads/:threadId')
	@GlobalScope('instanceAi:message')
	async getThread(req: AuthenticatedRequest, _res: Response, @Param('threadId') threadId: string) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return { thread: await this.memoryService.getThreadInfo(threadId) };
	}

	@Post('/threads')
	@GlobalScope('instanceAi:message')
	async ensureThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEnsureThreadRequest,
	) {
		this.requireInstanceAiEnabled();
		const project = await this.projectService.getProjectWithScope(req.user, payload.projectId, [
			'project:read',
		]);
		if (!project) {
			throw new ForbiddenError('You do not have access to the requested project');
		}
		const requestedThreadId = payload.threadId ?? randomUUID();
		await this.assertThreadAccess(req.user.id, requestedThreadId, { allowNew: true });

		const launchMetadata = {
			source: payload.source,
			origin: payload.origin ?? ('internal' as const),
			sourceContext: payload.sourceContext,
		};
		try {
			// An onboarding thread opens with the greeting and the first question card in place.
			return payload.source === 'onboarding'
				? await this.onboarding.ensureThread(
						req.user,
						requestedThreadId,
						payload.projectId,
						launchMetadata,
					)
				: await this.memoryService.ensureThread(
						req.user.id,
						requestedThreadId,
						payload.projectId,
						launchMetadata,
					);
		} catch (error) {
			this.instanceAiErrorReporter.report(error, {
				component: 'instance-ai-ensure-thread',
				threadId: requestedThreadId,
				userId: req.user.id,
				projectId: payload.projectId,
			});
			throw error;
		}
	}

	@Delete('/threads/:threadId')
	@GlobalScope('instanceAi:message')
	async deleteThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		await this.instanceAiService.routeClearThreadState(threadId, req.user.id);
		await this.memoryService.deleteThread(threadId);
		return { ok: true };
	}

	@Patch('/threads/:threadId')
	@GlobalScope('instanceAi:message')
	async renameThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: InstanceAiRenameThreadRequestDto,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		const thread = await this.memoryService.updateThread(threadId, {
			title: payload.title,
			metadata: payload.metadata,
		});
		return { thread };
	}

	@Get('/threads/:threadId/tabs')
	@GlobalScope('instanceAi:message')
	async getThreadTabs(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<InstanceAiThreadTabsResponse> {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return { state: await this.threadTabsService.getState(threadId, req.user.id) };
	}

	@Put('/threads/:threadId/tabs')
	@GlobalScope('instanceAi:message')
	async saveThreadTabs(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: InstanceAiThreadTabsRequestDto,
	): Promise<InstanceAiThreadTabsResponse> {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		// The DTO strips unknown keys, so the payload is the state to save.
		const state = { ...payload };
		await this.threadTabsService.saveState(threadId, req.user.id, state);
		return { state };
	}

	/**
	 * Persist the pending new-agent artifact this thread has open, and bind it to
	 * the thread in the same request. Idempotent under a concurrent writer on the
	 * same client-minted id (the chat's build-agent tool), unlike the strict
	 * project-scoped agent create.
	 */
	@Post('/threads/:threadId/agent')
	@GlobalScope('instanceAi:message')
	async persistPendingAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: InstanceAiPersistPendingAgentRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return await this.pendingAgentService.persistAndBind(req.user, threadId, payload);
	}

	@Get('/threads/:threadId/status')
	@GlobalScope('instanceAi:message')
	async getThreadStatus(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		this.requireInstanceAiEnabled();
		// Allow new threads — the frontend polls status before the first message is sent
		await this.assertThreadAccess(req.user.id, threadId, { allowNew: true });
		return await this.instanceAiService.getThreadStatus(threadId);
	}

	// ── Evaluation endpoints ──────────────────────────────────────────────────

	// Runs for minutes; the eval client (N8nClient) disables undici's 300s timeout for it.
	@Post('/eval/execute-with-llm-mock/:workflowId')
	@GlobalScope('instanceAi:eval')
	async executeWithLlmMock(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body payload: InstanceAiEvalExecutionRequest,
	) {
		return await this.evalExecutionService.executeWithLlmMock(workflowId, req.user, payload);
	}

	// Runs for minutes; same client timeout handling as the workflow variant.
	@Post('/eval/execute-agent-with-llm-mock/:agentId')
	@GlobalScope('instanceAi:eval')
	async executeAgentWithLlmMock(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: InstanceAiEvalAgentExecutionRequest,
	) {
		return await this.evalAgentExecutionService.executeWithLlmMock(agentId, req.user, payload);
	}

	/**
	 * Pin a build thread's credential view to a declared set. Only narrows:
	 * `list()` results are intersected with these IDs, so the caller cannot see
	 * anything they couldn't already access. The thread must exist — entries are
	 * cleared with the thread's state, so pins for never-created threads would
	 * be uncollectable.
	 */
	@Post('/eval/thread-credential-allowlist')
	@GlobalScope('instanceAi:eval')
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
	 * Observational memory for a thread, for a context eval to assert on.
	 *
	 * Returns the observation text, an LLM-written summary of the user's conversation.
	 * Gated like every other `/eval/` route: `instanceAi:eval` is owner/admin-only,
	 * and `assertThreadAccess` keeps a caller to threads they can already read in full.
	 */
	@Get('/eval/threads/:threadId/memory')
	@GlobalScope('instanceAi:eval')
	async getEvalThreadMemory(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<InstanceAiEvalThreadMemoryResponse> {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return await this.instanceAiService.getThreadMemory(req.user.id, threadId);
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
	@GlobalScope('instanceAi:eval')
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

		const workflows = payload.workflows ?? [];
		const agents = payload.agents ?? [];
		const folders = payload.folders ?? [];
		// Cross-field, so the schema can't own it: a seeded agent's workflow tool is
		// resolved by DISPLAY NAME, and a name no seeded workflow carries restores a
		// dead tool (or binds an unrelated ambient workflow of the same name).
		const unbacked = findUnbackedSeedWorkflowTools(payload);
		if (unbacked.length > 0) {
			throw new BadRequestError(
				unbacked
					.map(
						({ agentId, target }: { agentId: string; target: unknown }) =>
							`Seed agent ${agentId} has a workflow tool targeting ${JSON.stringify(target)}, which no seeded workflow's name matches`,
					)
					.join('; '),
			);
		}
		// Also cross-field: a workflow's `parentFolderId` must name a seeded folder.
		// Checked before anything is created, so a typo costs no rollback.
		const folderIssues = findSeedFolderIssues({ folders, workflows });
		if (folderIssues.length > 0) {
			throw new BadRequestError(folderIssues.join('; '));
		}
		// Folders first: the workflows are created inside them. `restoreFolders`
		// rolls its own partial work back, so nothing else exists yet if it fails.
		const folderIdMap = await this.evalThreadRestore.restoreFolders(folders, projectId, req.user);
		// Positional to `folders`, like `workflowIds` to `workflows`, so the harness
		// can pair each created id with the seed folder it came from.
		const folderIds = folders.flatMap((folder) => {
			const id = folderIdMap.get(folder.id);
			return id === undefined ? [] : [id];
		});
		// Roll back everything we created if a later step fails, so a partial
		// restore doesn't leak folders/tables/workflows/agents into the shared eval
		// project.
		let restored = 0;
		let dataTableIds: string[] = [];
		let createdWorkflowIds: string[] = [];
		let publishedWorkflowIds: string[] = [];
		let createdAgentIds: string[] = [];
		// Captured so the binding write is undoable: the message write happens after
		// it, and without this a message failure left a binding pointing at agents the
		// rollback had already deleted.
		let priorMetadata: Record<string, unknown> | undefined;
		let bindingWritten = false;
		// Seed node credentials resolve within the thread's pinned credential view,
		// so a same-named credential of a concurrent case is never picked.
		const allowedCredentialIds = this.evalCredentialAllowlists.get(payload.threadId);
		try {
			// Data tables before workflows: the workflows reference them, and their ids
			// are rewritten to the recreated tables' ids during workflow restore.
			const idMap = await this.evalThreadRestore.restoreDataTables(
				payload.dataTables ?? [],
				projectId,
				{ uniquifyNames: payload.uniquifyNames ?? true },
			);
			dataTableIds = [...idMap.values()];
			createdWorkflowIds = await this.evalThreadRestore.restoreWorkflows(
				workflows,
				projectId,
				req.user,
				idMap,
				allowedCredentialIds ? new Set(allowedCredentialIds) : undefined,
				folderIdMap,
			);
			// BEFORE the messages, which the rollback cannot undo: a refused activation
			// (no trigger, webhook conflict, unresolved credential) must fail while the
			// restore is still fully rollback-able. The rollback unpublishes.
			publishedWorkflowIds = await this.evalThreadRestore.publishSeedWorkflows(workflows, req.user);
			createdAgentIds = await this.evalThreadRestore.restoreAgents(
				agents,
				projectId,
				idMap,
				allowedCredentialIds ? new Set(allowedCredentialIds) : undefined,
			);
			// Built (and validated) BEFORE the message write: a rejected binding — two
			// agents whose refs collide — must fail while the restore is still fully
			// rollback-able, not after the messages have committed.
			const binding =
				createdAgentIds.length > 0
					? seedAgentBuilderTargetMetadata(
							agents.map((agent) => ({
								agentId: agent.id,
								projectId,
								name: agent.config.name,
								ref: agent.config.name,
							})),
							payload.messages,
						)
					: undefined;
			// Bind the thread as the conversation that built these agents would have, or
			// the live turn's first `build-agent` call is rejected as an unknown agentRef.
			// BEFORE the messages, and undoable: the catch restores the prior metadata,
			// so a message failure can't leave a binding pointing at deleted agents, and
			// a binding failure can't leave messages referencing them.
			if (binding) {
				priorMetadata = await this.memoryService.getThreadMetadata(req.user.id, payload.threadId);
				await this.memoryService.updateThread(payload.threadId, { metadata: binding });
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
			await this.evalThreadRestore.deleteAgents(createdAgentIds, projectId);
			// Every seed this restore published, not only the created ones: a re-applied
			// seed is not in `createdWorkflowIds`, so the delete below never sees it.
			await this.evalThreadRestore.unpublishWorkflows(publishedWorkflowIds);
			await this.evalThreadRestore.deleteWorkflows(createdWorkflowIds);
			await this.evalThreadRestore.deleteDataTables(dataTableIds, projectId);
			// Last, with the contents moved to the root: a re-applied seed workflow
			// (moved into the folder, not created) is kept by this rollback, so the
			// folder must not take it down.
			await this.evalThreadRestore.deleteFolders(folders, folderIdMap, projectId, req.user);
			throw error;
		}
		return {
			ok: true,
			threadId: payload.threadId,
			restored,
			workflowIds: workflows.map((workflow) => workflow.id),
			dataTableIds,
			agentIds: createdAgentIds,
			folderIds,
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
	@GlobalScope('instanceAi:eval')
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

	// ── Gateway endpoints (daemon ↔ server) ──────────────────────────────────

	@Post('/gateway/create-link')
	@GlobalScope('instanceAi:gateway')
	async createGatewayLink(req: AuthenticatedRequest) {
		await this.assertGatewayEnabled(req.user.id);
		const token = this.gatewayService.generatePairingToken(req.user.id);
		const expiresAt = this.gatewayService.getGatewayApiKeyExpiresAt(req.user.id, token);
		const ttlSeconds = expiresAt
			? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
			: null;
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const command = `npx @n8n/computer-use ${baseUrl} ${token}`;
		return { token, command, expiresAt: expiresAt?.toISOString() ?? null, ttlSeconds };
	}

	@Get('/gateway/events', { usesTemplates: true, skipAuth: true })
	async gatewayEvents(req: Request, res: FlushableResponse) {
		const userId = this.validateGatewayApiKey(this.getGatewayKeyHeader(req));
		await this.assertGatewayEnabled(userId);

		const gateway = this.gatewayService.getLocalGateway(userId);

		// If the grace-period timer already fired (e.g. after a long reconnect gap),
		// the gateway state is torn down. Reject so the daemon falls into its auth-error
		// reconnect branch, which re-uploads capabilities and re-establishes state.
		if (!gateway.isConnected) {
			throw new ForbiddenError('Local gateway not initialized');
		}

		// Daemon reconnected within the grace window — cancel the pending disconnect.
		this.gatewayService.clearDisconnectTimer(userId);

		(res as unknown as { compress: boolean }).compress = false;
		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();

		const unsubscribeRequest = gateway.onRequest((event) => {
			res.write(`data: ${JSON.stringify(event)}\n\n`);
			res.flush?.();
		});
		const unsubscribeDisconnect = gateway.onDisconnect((event) => {
			res.write(`data: ${JSON.stringify(event)}\n\n`);
			res.flush?.();
			res.end();
		});

		const keepAlive = setInterval(() => {
			res.write(': ping\n\n');
			res.flush?.();
		}, KEEP_ALIVE_INTERVAL_MS);

		let cleanedUp = false;
		const cleanup = () => {
			if (cleanedUp) return;
			cleanedUp = true;
			unsubscribeRequest();
			unsubscribeDisconnect();
			clearInterval(keepAlive);
			this.gatewayService.startDisconnectTimer(userId, () => {
				this.push.sendToUsers(
					{
						type: 'instanceAiGatewayStateChanged',
						data: {
							connected: false,
							directory: null,
							hostIdentifier: null,
							toolCategories: [],
						},
					},
					[userId],
				);
			});
		};
		res.once('close', cleanup);
		res.once('finish', cleanup);
	}

	@Post('/gateway/init', { skipAuth: true })
	async gatewayInit(req: Request, _res: Response, @Body payload: InstanceAiGatewayCapabilitiesDto) {
		const key = this.getGatewayKeyHeader(req);
		const userId = this.validateGatewayApiKey(key);
		await this.assertGatewayEnabled(userId);

		this.gatewayService.initGateway(userId, payload);
		this.gatewayService.applyToolPolicy(userId);

		const status = this.gatewayService.getGatewayStatus(userId);
		this.push.sendToUsers(
			{
				type: 'instanceAiGatewayStateChanged',
				data: {
					connected: status.connected,
					directory: status.directory,
					hostIdentifier: status.hostIdentifier,
					toolCategories: status.toolCategories,
				},
			},
			[userId],
		);

		// Try to consume a pairing token and upgrade to a session key
		const sessionKey = key ? this.gatewayService.consumePairingToken(userId, key) : null;
		if (sessionKey) {
			return { ok: true, sessionKey };
		}
		return { ok: true };
	}

	@Post('/gateway/disconnect', { skipAuth: true })
	gatewayDisconnect(req: Request) {
		const userId = this.validateGatewayApiKey(this.getGatewayKeyHeader(req));

		this.gatewayService.clearDisconnectTimer(userId);
		this.gatewayService.disconnectGateway(userId);
		this.gatewayService.clearActiveSessionKey(userId);
		this.push.sendToUsers(
			{
				type: 'instanceAiGatewayStateChanged',
				data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
			},
			[userId],
		);
		return { ok: true };
	}

	@Post('/gateway/response/:requestId', { skipAuth: true })
	gatewayResponse(
		req: Request,
		_res: Response,
		@Param('requestId') requestId: string,
		@Body payload: InstanceAiFilesystemResponseDto,
	) {
		const userId = this.validateGatewayApiKey(this.getGatewayKeyHeader(req));

		const resolved = this.gatewayService.resolveGatewayRequest(
			userId,
			requestId,
			payload.result,
			payload.error,
		);
		if (!resolved) {
			throw new NotFoundError('Gateway request not found or already resolved');
		}
		return { ok: true };
	}

	@Post('/gateway/credentials', { skipAuth: true })
	async gatewayCreateCredential(
		req: Request,
		_res: Response,
		@Body payload: InstanceAiGatewayCreateCredentialDto,
	) {
		const user = await this.resolveGatewayUser(this.getGatewayKeyHeader(req));
		await this.assertGatewayEnabled(user.id);
		const credential = await this.credentialsService.createUnmanagedCredential(payload, user);
		return { credentialId: credential.id };
	}

	@Get('/gateway/status')
	@GlobalScope('instanceAi:gateway')
	async gatewayStatus(req: AuthenticatedRequest) {
		await this.assertGatewayEnabled(req.user.id);
		this.gatewayService.applyToolPolicy(req.user.id);
		return this.gatewayService.getGatewayStatus(req.user.id);
	}

	/**
	 * User-initiated gateway disconnect. Tears down the paired daemon session
	 * so its tools are no longer exposed to the agent, without changing the
	 * user's preference to disabled.
	 */
	@Post('/gateway/disconnect-session')
	@GlobalScope('instanceAi:gateway')
	async gatewayDisconnectSession(req: AuthenticatedRequest) {
		const userId = req.user.id;
		this.gatewayService.clearDisconnectTimer(userId);
		this.gatewayService.disconnectGateway(userId);
		this.gatewayService.clearActiveSessionKey(userId);
		this.push.sendToUsers(
			{
				type: 'instanceAiGatewayStateChanged',
				data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
			},
			[userId],
		);
		return { ok: true };
	}

	@Post('/browser/create-link')
	@GlobalScope('instanceAi:gateway')
	async createBrowserLink(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		this.assertBrowserChannelEnabled();
		return await this.browserSessionService.createLink(req.user.id);
	}

	@Get('/browser/status')
	@GlobalScope('instanceAi:gateway')
	browserStatus(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		this.assertBrowserChannelEnabled();
		return this.browserSessionService.getStatus(req.user.id);
	}

	@Post('/browser/disconnect-session')
	@GlobalScope('instanceAi:gateway')
	async browserDisconnectSession(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		await this.browserSessionService.disconnect(req.user.id);
		return { ok: true };
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private assertBrowserChannelEnabled(): void {
		if (!this.settingsService.isBrowserUseEnabled()) {
			throw new ForbiddenError('Browser Use is disabled');
		}
	}

	/**
	 * Verify thread ownership. Throws ForbiddenError if another user owns it.
	 * @param allowNew When true, a non-existent thread is permitted (new conversation).
	 */
	private async assertThreadAccess(
		userId: string,
		threadId: string,
		options?: { allowNew?: boolean },
	): Promise<void> {
		const ownership = await this.memoryService.checkThreadOwnership(userId, threadId);
		if (ownership === 'other_user') {
			throw new ForbiddenError('Not authorized for this thread');
		}
		if (!options?.allowNew && ownership === 'not_found') {
			throw new NotFoundError('Thread not found');
		}
	}

	/** Throw if the local gateway is disabled globally or for this user. */
	private async assertGatewayEnabled(userId: string): Promise<void> {
		if (await this.settingsService.isLocalGatewayDisabledForUser(userId)) {
			throw new ForbiddenError('Local gateway is disabled');
		}
	}

	/**
	 * Safely extract and validate the x-gateway-key header value.
	 * Headers can be string | string[] | undefined — take only the first value
	 * and validate against the shared gateway key schema.
	 */
	private getGatewayKeyHeader(req: Request): string | undefined {
		const raw = req.headers['x-gateway-key'];
		const value = Array.isArray(raw) ? raw[0] : raw;
		const parsed = instanceAiGatewayKeySchema.safeParse(value);
		return parsed.success ? parsed.data : undefined;
	}

	/**
	 * Validate the gateway API key from query param or header.
	 * Accepts: static env var key, one-time pairing token (init only), or active session key.
	 * Returns the userId associated with the key.
	 */
	private validateGatewayApiKey(key: string | undefined): string {
		if (!key) {
			throw new ForbiddenError('Missing API key');
		}
		const actual = Buffer.from(key);

		// Check static env var key — out of user-scoped flow, uses a sentinel userId
		if (this.gatewayApiKey) {
			const expected = Buffer.from(this.gatewayApiKey);
			if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
				return 'env-gateway';
			}
		}

		// Check per-user pairing token or session key via reverse lookup
		const userId = this.gatewayService.getUserIdForApiKey(key);
		if (userId) return userId;

		throw new ForbiddenError('Invalid API key');
	}

	/**
	 * Resolve a gateway API key to its associated User. Requires a user-scoped
	 * key — the static env-var key (which has no associated DB user) is rejected.
	 */
	private async resolveGatewayUser(key: string | undefined): Promise<User> {
		const userId = this.validateGatewayApiKey(key);
		if (userId === 'env-gateway') {
			throw new ForbiddenError('Credential creation requires a user-scoped gateway key');
		}
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['role', 'role.scopes'],
		});
		if (!user) throw new ForbiddenError('Invalid API key');
		return user;
	}

}
