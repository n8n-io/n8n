import type {
	InstanceAiEvalExportExecutionRequest,
	InstanceAiEvalRestoreExecutionRequest,
	InstanceAiEvalSeedDataTableRowsRequest,
} from '@n8n/api-types';
import {
	InstanceAiAssistantEvalCreateThreadRequest,
	InstanceAiAssistantEvalThreadOverridesRequest,
} from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { SystemAgentEvalService } from '@/modules/agents/system-agents/system-agent-eval.service';

import type { FailedExecutionPortabilityService } from '../../../eval/failed-execution-portability.service';
import { EvalThreadCredentialAllowlistService } from '../../../eval/thread-credential-allowlist.service';
import type { EvalThreadRestoreService } from '../../../eval/thread-restore.service';
import type { InstanceAiSettingsService } from '../../../instance-ai-settings.service';
import { AssistantAgentEvalController } from '../assistant-agent-eval.controller';
import { EvalAssistantTurnOverrides } from '../eval-assistant-turn-overrides';

const THREAD_ID = '6b1f0f5e-3c43-4a59-9e0c-2f6f4f3f9b11';
const PROJECT_ID = 'project-1';

describe('AssistantAgentEvalController', () => {
	function setup() {
		const user = mock<User>({ id: 'user-1' });
		const req = mock<AuthenticatedRequest>({ user });
		const res = mock<Response>();
		const settings = mock<InstanceAiSettingsService>();
		settings.isInstanceAiEnabled.mockReturnValue(true);
		const systemAgents = mock<SystemAgentEvalService>();
		const thread = { id: THREAD_ID, projectId: PROJECT_ID };
		systemAgents.getUsableThread.mockResolvedValue(thread);
		systemAgents.createThread.mockResolvedValue(thread);
		const allowlists = new EvalThreadCredentialAllowlistService();
		const overrides = new EvalAssistantTurnOverrides(allowlists);
		const restore = mock<EvalThreadRestoreService>();
		const portability = mock<FailedExecutionPortabilityService>();
		const controller = new AssistantAgentEvalController(
			settings,
			systemAgents,
			overrides,
			allowlists,
			restore,
			portability,
		);
		return {
			user,
			req,
			res,
			settings,
			systemAgents,
			allowlists,
			overrides,
			restore,
			portability,
			controller,
		};
	}

	/** Each route with its call, for the checks that every route shares. */
	function routes(ctx: ReturnType<typeof setup>) {
		const { controller, req, res } = ctx;
		return {
			createThread: async () =>
				await controller.createThread(req, res, { threadId: THREAD_ID, projectId: PROJECT_ID }),
			deleteThread: async () => await controller.deleteThread(req, res, THREAD_ID),
			setThreadOverrides: async () =>
				await controller.setThreadOverrides(req, res, THREAD_ID, { mode: 'progressive' }),
			setThreadCredentialAllowlist: async () =>
				await controller.setThreadCredentialAllowlist(req, res, {
					threadId: THREAD_ID,
					credentialIds: ['cred-1'],
				}),
			setThreadCredentialTestTarget: async () =>
				await controller.setThreadCredentialTestTarget(req, res, {
					threadId: THREAD_ID,
					credentialType: 'slackApi',
					baseUrl: 'http://stand-in',
					urlField: 'url',
				}),
			exportExecution: async () =>
				await controller.exportExecution(req, res, {
					threadId: THREAD_ID,
					executionId: 'exec-1',
				} satisfies InstanceAiEvalExportExecutionRequest),
			restoreExecution: async () =>
				await controller.restoreExecution(req, res, {
					threadId: THREAD_ID,
					workflowId: 'wf-1',
					envelope: {},
				} as InstanceAiEvalRestoreExecutionRequest),
			seedDataTableRows: async () =>
				await controller.seedDataTableRows(req, res, {
					threadId: THREAD_ID,
					tableId: 'table-0001',
					rows: [{ name: 'a' }],
				} satisfies InstanceAiEvalSeedDataTableRowsRequest),
		};
	}

	describe('route metadata', () => {
		const metadata = Container.get(ControllerRegistryMetadata);
		const controllerClass = AssistantAgentEvalController as unknown as Controller;

		it.each([
			['createThread', 'post', '/eval/threads'],
			['deleteThread', 'delete', '/eval/threads/:threadId'],
			['setThreadOverrides', 'put', '/eval/threads/:threadId/overrides'],
			['setThreadCredentialAllowlist', 'post', '/eval/thread-credential-allowlist'],
			['setThreadCredentialTestTarget', 'post', '/eval/thread-credential-test-target'],
			['exportExecution', 'post', '/eval/export-execution'],
			['restoreExecution', 'post', '/eval/restore-execution'],
			['seedDataTableRows', 'post', '/eval/seed-data-table-rows'],
		])('serves %s at %s /assistant%s with the instanceAi:manage scope', (handler, method, path) => {
			expect(metadata.getControllerMetadata(controllerClass).basePath).toBe('/assistant');
			const route = metadata.getRouteMetadata(controllerClass, handler);
			expect(route.method).toBe(method);
			expect(route.path).toBe(path);
			expect(route.accessScope).toEqual({ scope: 'instanceAi:manage', globalOnly: true });
		});
	});

	describe('access', () => {
		it('rejects every route when Instance AI is disabled', async () => {
			const ctx = setup();
			ctx.settings.isInstanceAiEnabled.mockReturnValue(false);

			for (const call of Object.values(routes(ctx))) {
				await expect(call()).rejects.toThrow(ForbiddenError);
			}
			expect(ctx.systemAgents.createThread).not.toHaveBeenCalled();
			expect(ctx.systemAgents.getUsableThread).not.toHaveBeenCalled();
			expect(ctx.systemAgents.deleteThread).not.toHaveBeenCalled();
		});

		it('rejects a thread that the caller cannot use, before it changes state', async () => {
			const ctx = setup();
			ctx.systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));
			const { createThread: _create, deleteThread: _delete, ...threadRoutes } = routes(ctx);

			for (const call of Object.values(threadRoutes)) {
				await expect(call()).rejects.toThrow(NotFoundError);
			}
			expect(ctx.systemAgents.getUsableThread).toHaveBeenCalledWith(
				'assistant',
				ctx.user,
				THREAD_ID,
			);
			expect(ctx.overrides.getBuildMode(THREAD_ID)).toBeUndefined();
			expect(ctx.allowlists.get(THREAD_ID)).toBeUndefined();
			expect(ctx.allowlists.getTestTarget(THREAD_ID, 'slackApi')).toBeUndefined();
			expect(ctx.portability.exportExecution).not.toHaveBeenCalled();
			expect(ctx.portability.restoreExecution).not.toHaveBeenCalled();
			expect(ctx.restore.reseedDataTableRows).not.toHaveBeenCalled();
		});

		it('keeps the state of a thread that the caller does not own on delete', async () => {
			const ctx = setup();
			ctx.allowlists.set(THREAD_ID, ['cred-1']);
			ctx.overrides.setThreadOverrides(THREAD_ID, { mode: 'progressive' });
			ctx.systemAgents.deleteThread.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(ctx.controller.deleteThread(ctx.req, ctx.res, THREAD_ID)).rejects.toThrow(
				NotFoundError,
			);

			expect(ctx.allowlists.get(THREAD_ID)).toEqual(['cred-1']);
			expect(ctx.overrides.getBuildMode(THREAD_ID)).toBe('progressive');
		});
	});

	it('creates the Assistant agent thread in the requested project', async () => {
		const ctx = setup();

		const result = await routes(ctx).createThread();

		expect(result).toEqual({ threadId: THREAD_ID, projectId: PROJECT_ID });
		expect(ctx.systemAgents.createThread).toHaveBeenCalledWith({
			agentId: 'assistant',
			user: ctx.user,
			projectId: PROJECT_ID,
			threadId: THREAD_ID,
		});
	});

	it('deletes the thread and clears its overrides and credential settings', async () => {
		const ctx = setup();
		ctx.allowlists.set(THREAD_ID, ['cred-1'], ['cred-1']);
		ctx.allowlists.setTestTarget(THREAD_ID, {
			credentialType: 'slackApi',
			baseUrl: 'http://stand-in',
			urlField: 'url',
		});
		ctx.overrides.setThreadOverrides(THREAD_ID, { mode: 'progressive', promptVersion: 'v2' });

		const result = await routes(ctx).deleteThread();

		expect(result).toEqual({ ok: true });
		expect(ctx.systemAgents.deleteThread).toHaveBeenCalledWith('assistant', ctx.user, THREAD_ID);
		expect(ctx.allowlists.get(THREAD_ID)).toBeUndefined();
		expect(ctx.allowlists.getTestTarget(THREAD_ID, 'slackApi')).toBeUndefined();
		expect(ctx.overrides.getBuildMode(THREAD_ID)).toBeUndefined();
		expect(ctx.overrides.getPromptVersion(THREAD_ID)).toBeUndefined();
	});

	it('replaces the turn overrides of the thread', async () => {
		const ctx = setup();

		await ctx.controller.setThreadOverrides(ctx.req, ctx.res, THREAD_ID, {
			mode: 'progressive',
			promptVersion: 'v2',
		});
		const result = await ctx.controller.setThreadOverrides(ctx.req, ctx.res, THREAD_ID, {
			promptVersion: 'v3',
		});

		expect(result).toEqual({ ok: true });
		expect(ctx.overrides.getBuildMode(THREAD_ID)).toBeUndefined();
		expect(ctx.overrides.getPromptVersion(THREAD_ID)).toBe('v3');
	});

	it('pins the credential view of the thread', async () => {
		const ctx = setup();

		const result = await ctx.controller.setThreadCredentialAllowlist(ctx.req, ctx.res, {
			threadId: THREAD_ID,
			credentialIds: ['cred-1', 'cred-2'],
			bypassCredentialTest: ['cred-2'],
		});

		expect(result).toEqual({ ok: true });
		expect(ctx.overrides.getCredentialIdAllowlist(THREAD_ID)).toEqual(['cred-1', 'cred-2']);
		expect(ctx.overrides.shouldBypassCredentialTest(THREAD_ID, 'cred-2')).toBe(true);
	});

	it('sets the credential test target of the thread', async () => {
		const ctx = setup();

		await expect(routes(ctx).setThreadCredentialTestTarget()).resolves.toEqual({ ok: true });

		expect(ctx.overrides.getCredentialTestTarget(THREAD_ID, 'slackApi')).toEqual({
			credentialType: 'slackApi',
			baseUrl: 'http://stand-in',
			urlField: 'url',
		});
	});

	it('exports and restores executions in the project of the thread', async () => {
		const ctx = setup();
		ctx.portability.exportExecution.mockResolvedValue(mock());
		ctx.portability.restoreExecution.mockResolvedValue(mock());
		const calls = routes(ctx);

		await calls.exportExecution();
		await calls.restoreExecution();

		expect(ctx.portability.exportExecution).toHaveBeenCalledWith(ctx.user, PROJECT_ID, 'exec-1');
		expect(ctx.portability.restoreExecution).toHaveBeenCalledWith(ctx.user, PROJECT_ID, 'wf-1', {});
	});

	it('reseeds data table rows in the project of the thread', async () => {
		const ctx = setup();

		const result = await routes(ctx).seedDataTableRows();

		expect(result).toEqual({ ok: true, tableId: 'table-0001', rowCount: 1 });
		expect(ctx.restore.reseedDataTableRows).toHaveBeenCalledWith('table-0001', PROJECT_ID, [
			{ name: 'a' },
		]);
	});

	describe('request DTOs', () => {
		it('needs a uuid thread id and a project id to create a thread', () => {
			expect(
				InstanceAiAssistantEvalCreateThreadRequest.safeParse({
					threadId: THREAD_ID,
					projectId: PROJECT_ID,
				}).success,
			).toBe(true);
			expect(
				InstanceAiAssistantEvalCreateThreadRequest.safeParse({
					threadId: 'not-a-uuid',
					projectId: PROJECT_ID,
				}).success,
			).toBe(false);
			expect(
				InstanceAiAssistantEvalCreateThreadRequest.safeParse({ threadId: THREAD_ID, projectId: '' })
					.success,
			).toBe(false);
		});

		it.each([
			[{}, true],
			[{ mode: 'progressive', promptVersion: 'v2' }, true],
			[{ mode: 'fast' }, false],
			[{ promptVersion: '   ' }, false],
			[{ promptVersion: 'x'.repeat(129) }, false],
		])('validates overrides %j as %s', (body, valid) => {
			expect(InstanceAiAssistantEvalThreadOverridesRequest.safeParse(body).success).toBe(valid);
		});
	});
});
