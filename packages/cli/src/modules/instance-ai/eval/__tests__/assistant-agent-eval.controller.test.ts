import type {
	InstanceAiEvalExportExecutionRequest,
	InstanceAiEvalRestoreExecutionRequest,
	InstanceAiEvalRestoreThreadRequest,
	InstanceAiEvalSeedDataTableRowsRequest,
} from '@n8n/api-types';
import {
	InstanceAiAssistantEvalCreateThreadRequest,
	InstanceAiAssistantEvalThreadOverridesRequest,
} from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { agentBuilderTargetMetadata } from '@n8n/instance-ai';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { SystemAgentEvalService } from '@/modules/agents/system-agents/system-agent-eval.service';
import type { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import type { FailedExecutionPortabilityService } from '../failed-execution-portability.service';
import { EvalThreadCredentialAllowlistService } from '../thread-credential-allowlist.service';
import type { EvalThreadRestoreService, RestoredSeedArtifacts } from '../thread-restore.service';
import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';
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
		// Stands in for the locked thread row: `patch` replaces the stored metadata.
		const stored: { metadata: Record<string, unknown> } = { metadata: { other: 'kept' } };
		const threadMetadata = mock<SystemAgentThreadMetadataService>();
		threadMetadata.patch.mockImplementation(async (_agentId, _user, _threadId, change) => {
			const next = change(stored.metadata);
			if (next) stored.metadata = next;
			return stored.metadata;
		});
		const controller = new AssistantAgentEvalController(
			settings,
			systemAgents,
			overrides,
			allowlists,
			restore,
			portability,
			threadMetadata,
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
			threadMetadata,
			stored,
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
				await controller.setThreadOverrides(req, res, THREAD_ID, { promptVersion: 'v2' }),
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
			restoreThread: async () =>
				await controller.restoreThread(req, res, {
					threadId: THREAD_ID,
					messages: [],
				} as InstanceAiEvalRestoreThreadRequest),
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
			['restoreThread', 'post', '/eval/restore-thread'],
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
			expect(ctx.overrides.getPromptVersion(THREAD_ID)).toBeUndefined();
			expect(ctx.allowlists.get(THREAD_ID)).toBeUndefined();
			expect(ctx.allowlists.getTestTarget(THREAD_ID, 'slackApi')).toBeUndefined();
			expect(ctx.portability.exportExecution).not.toHaveBeenCalled();
			expect(ctx.portability.restoreExecution).not.toHaveBeenCalled();
			expect(ctx.restore.reseedDataTableRows).not.toHaveBeenCalled();
			expect(ctx.restore.restoreSeedArtifacts).not.toHaveBeenCalled();
		});

		it('keeps the state of a thread that the caller does not own on delete', async () => {
			const ctx = setup();
			ctx.allowlists.set(THREAD_ID, ['cred-1']);
			ctx.overrides.setThreadOverrides(THREAD_ID, { promptVersion: 'v2' });
			ctx.systemAgents.deleteThread.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(ctx.controller.deleteThread(ctx.req, ctx.res, THREAD_ID)).rejects.toThrow(
				NotFoundError,
			);

			expect(ctx.allowlists.get(THREAD_ID)).toEqual(['cred-1']);
			expect(ctx.overrides.getPromptVersion(THREAD_ID)).toBe('v2');
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
		// Without provenance the route does not touch the thread metadata.
		expect(ctx.systemAgents.ensureMemoryThread).not.toHaveBeenCalled();
		expect(ctx.threadMetadata.patch).not.toHaveBeenCalled();
	});

	it('stores the thread provenance in the thread metadata', async () => {
		const ctx = setup();

		const result = await ctx.controller.createThread(ctx.req, ctx.res, {
			threadId: THREAD_ID,
			projectId: PROJECT_ID,
			source: 'evals',
			sourceContext: { evalCase: 'slack-digest', evalIteration: 2 },
		});

		expect(result).toEqual({ threadId: THREAD_ID, projectId: PROJECT_ID });
		expect(ctx.systemAgents.ensureMemoryThread).toHaveBeenCalledWith(
			'assistant',
			ctx.user,
			THREAD_ID,
		);
		expect(ctx.systemAgents.ensureMemoryThread.mock.invocationCallOrder[0]).toBeLessThan(
			ctx.threadMetadata.patch.mock.invocationCallOrder[0],
		);
		expect(ctx.threadMetadata.patch).toHaveBeenCalledWith(
			'assistant',
			ctx.user,
			THREAD_ID,
			expect.any(Function),
		);
		expect(ctx.stored.metadata).toEqual({
			other: 'kept',
			source: 'evals',
			sourceContext: { evalCase: 'slack-digest', evalIteration: 2 },
		});
	});

	it('stores only the provenance keys that the request gives', async () => {
		const ctx = setup();
		ctx.stored.metadata = { source: 'evals', sourceContext: { evalCase: 'old' } };

		await ctx.controller.createThread(ctx.req, ctx.res, {
			threadId: THREAD_ID,
			projectId: PROJECT_ID,
			sourceContext: { evalCase: 'new' },
		});

		expect(ctx.stored.metadata).toEqual({ source: 'evals', sourceContext: { evalCase: 'new' } });
	});

	it('deletes the thread and clears its overrides and credential settings', async () => {
		const ctx = setup();
		ctx.allowlists.set(THREAD_ID, ['cred-1'], ['cred-1']);
		ctx.allowlists.setTestTarget(THREAD_ID, {
			credentialType: 'slackApi',
			baseUrl: 'http://stand-in',
			urlField: 'url',
		});
		ctx.overrides.setThreadOverrides(THREAD_ID, { promptVersion: 'v2' });

		const result = await routes(ctx).deleteThread();

		expect(result).toEqual({ ok: true });
		expect(ctx.systemAgents.deleteThread).toHaveBeenCalledWith('assistant', ctx.user, THREAD_ID);
		expect(ctx.allowlists.get(THREAD_ID)).toBeUndefined();
		expect(ctx.allowlists.getTestTarget(THREAD_ID, 'slackApi')).toBeUndefined();
		expect(ctx.overrides.getPromptVersion(THREAD_ID)).toBeUndefined();
	});

	it('replaces the turn overrides of the thread', async () => {
		const ctx = setup();

		await ctx.controller.setThreadOverrides(ctx.req, ctx.res, THREAD_ID, { promptVersion: 'v2' });
		const result = await ctx.controller.setThreadOverrides(ctx.req, ctx.res, THREAD_ID, {});

		expect(result).toEqual({ ok: true });
		expect(ctx.overrides.getPromptVersion(THREAD_ID)).toBeUndefined();
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

	describe('restoreThread', () => {
		const seedMessages = [
			{
				id: 'msg-1',
				createdAt: '2026-01-01T00:00:00.000Z',
				role: 'user',
				content: [{ type: 'text', text: 'Build a Slack bot' }],
			},
			{
				id: 'msg-2',
				createdAt: '2026-01-01T00:00:01.000Z',
				role: 'assistant',
				content: [{ type: 'text', text: 'Done' }],
			},
		];
		// The real binding keys, so the undo through `clearedAgentBuilderTargetMetadata` matches them.
		const binding = agentBuilderTargetMetadata([
			{ agentId: 'agent-1', projectId: PROJECT_ID, name: 'Slack bot', ref: 'Slack bot' },
		]);

		function seedArtifacts(overrides: Partial<RestoredSeedArtifacts> = {}) {
			const seed: RestoredSeedArtifacts = {
				folderIds: ['folder-1'],
				dataTableIds: ['table-1'],
				workflowIds: ['wf-1'],
				createdWorkflowIds: ['wf-1'],
				publishedWorkflowIds: [],
				agentIds: [],
				agentBuilderBinding: undefined,
				rollback: vi.fn(async () => {}),
				...overrides,
			};
			return seed;
		}

		function payload(messages: Array<Record<string, unknown>> = seedMessages) {
			return { threadId: THREAD_ID, messages } as InstanceAiEvalRestoreThreadRequest;
		}

		it('recreates the artifacts in the project of the thread, then writes the messages', async () => {
			const ctx = setup();
			ctx.allowlists.set(THREAD_ID, ['cred-1']);
			const seed = seedArtifacts();
			ctx.restore.restoreSeedArtifacts.mockResolvedValue(seed);
			const body = payload();

			const result = await ctx.controller.restoreThread(ctx.req, ctx.res, body);

			expect(ctx.systemAgents.getUsableThread).toHaveBeenCalledWith(
				'assistant',
				ctx.user,
				THREAD_ID,
			);
			expect(ctx.restore.restoreSeedArtifacts).toHaveBeenCalledWith(
				body,
				PROJECT_ID,
				ctx.user,
				new Set(['cred-1']),
			);
			expect(ctx.systemAgents.ensureMemoryThread).toHaveBeenCalledWith(
				'assistant',
				ctx.user,
				THREAD_ID,
			);
			// The seed keeps its roles and content under new ids. `createdAt` becomes a date.
			expect(ctx.systemAgents.saveMessages).toHaveBeenCalledWith(
				'assistant',
				ctx.user,
				THREAD_ID,
				seedMessages.map((message) => ({
					...message,
					id: expect.not.stringMatching(message.id),
					createdAt: new Date(message.createdAt),
				})),
			);
			expect(ctx.threadMetadata.patch).not.toHaveBeenCalled();
			expect(seed.rollback).not.toHaveBeenCalled();
			expect(result).toEqual({
				ok: true,
				threadId: THREAD_ID,
				restored: 2,
				workflowIds: ['wf-1'],
				dataTableIds: ['table-1'],
				agentIds: [],
				folderIds: ['folder-1'],
			});
		});

		it('passes no allowlist when the thread has none', async () => {
			const ctx = setup();
			ctx.restore.restoreSeedArtifacts.mockResolvedValue(seedArtifacts());

			await ctx.controller.restoreThread(ctx.req, ctx.res, payload());

			expect(ctx.restore.restoreSeedArtifacts).toHaveBeenCalledWith(
				expect.anything(),
				PROJECT_ID,
				ctx.user,
				undefined,
			);
		});

		it('writes no messages and no memory row for a seed without messages or agents', async () => {
			const ctx = setup();
			ctx.restore.restoreSeedArtifacts.mockResolvedValue(seedArtifacts());

			const result = await ctx.controller.restoreThread(ctx.req, ctx.res, payload([]));

			expect(result).toMatchObject({ ok: true, restored: 0 });
			expect(ctx.systemAgents.ensureMemoryThread).not.toHaveBeenCalled();
			expect(ctx.systemAgents.saveMessages).not.toHaveBeenCalled();
		});

		it('binds the seeded agents before it writes the messages, and keeps the other keys', async () => {
			const ctx = setup();
			const order: string[] = [];
			ctx.systemAgents.ensureMemoryThread.mockImplementation(async () => {
				order.push('ensureThread');
			});
			ctx.threadMetadata.patch.mockImplementationOnce(async (_a, _u, _t, change) => {
				order.push('binding');
				ctx.stored.metadata = change(ctx.stored.metadata) ?? ctx.stored.metadata;
				return ctx.stored.metadata;
			});
			ctx.systemAgents.saveMessages.mockImplementation(async () => {
				order.push('messages');
			});
			ctx.restore.restoreSeedArtifacts.mockResolvedValue(
				seedArtifacts({ agentIds: ['agent-1'], agentBuilderBinding: binding }),
			);

			const result = await ctx.controller.restoreThread(ctx.req, ctx.res, payload());

			expect(order).toEqual(['ensureThread', 'binding', 'messages']);
			expect(ctx.threadMetadata.patch).toHaveBeenCalledWith(
				'assistant',
				ctx.user,
				THREAD_ID,
				expect.any(Function),
			);
			expect(ctx.stored.metadata).toEqual({ other: 'kept', ...binding });
			expect(result).toMatchObject({ agentIds: ['agent-1'] });
		});

		it('undoes the binding and rolls back the artifacts when the message write fails', async () => {
			const ctx = setup();
			const seed = seedArtifacts({ agentIds: ['agent-1'], agentBuilderBinding: binding });
			ctx.restore.restoreSeedArtifacts.mockResolvedValue(seed);
			ctx.systemAgents.saveMessages.mockRejectedValue(new Error('boom'));

			await expect(ctx.controller.restoreThread(ctx.req, ctx.res, payload())).rejects.toThrow(
				'boom',
			);

			expect(ctx.threadMetadata.patch).toHaveBeenCalledTimes(2);
			// The undo writes the binding keys as undefined, which drops them from the stored JSON.
			expect(ctx.stored.metadata).toEqual({ other: 'kept' });
			expect(seed.rollback).toHaveBeenCalledTimes(1);
		});

		it('rolls back the artifacts and rethrows the first error when the undo of the binding fails', async () => {
			const ctx = setup();
			const seed = seedArtifacts({ agentIds: ['agent-1'], agentBuilderBinding: binding });
			ctx.restore.restoreSeedArtifacts.mockResolvedValue(seed);
			ctx.systemAgents.saveMessages.mockRejectedValue(new Error('boom'));
			ctx.threadMetadata.patch
				.mockImplementationOnce(async () => ({}))
				.mockRejectedValueOnce(new Error('undo failed'));

			await expect(ctx.controller.restoreThread(ctx.req, ctx.res, payload())).rejects.toThrow(
				'boom',
			);
			expect(seed.rollback).toHaveBeenCalledTimes(1);
		});

		it('rejects a seed message that is not valid before it creates any artifact', async () => {
			const ctx = setup();

			await expect(
				ctx.controller.restoreThread(ctx.req, ctx.res, payload([{ id: 'msg-1' }])),
			).rejects.toThrow(BadRequestError);

			expect(ctx.restore.restoreSeedArtifacts).not.toHaveBeenCalled();
			expect(ctx.systemAgents.ensureMemoryThread).not.toHaveBeenCalled();
			expect(ctx.systemAgents.saveMessages).not.toHaveBeenCalled();
		});

		it('writes nothing to the thread when the artifact restore fails', async () => {
			const ctx = setup();
			ctx.restore.restoreSeedArtifacts.mockRejectedValue(new BadRequestError('bad seed'));

			await expect(ctx.controller.restoreThread(ctx.req, ctx.res, payload())).rejects.toThrow(
				BadRequestError,
			);

			expect(ctx.systemAgents.ensureMemoryThread).not.toHaveBeenCalled();
			expect(ctx.threadMetadata.patch).not.toHaveBeenCalled();
			expect(ctx.systemAgents.saveMessages).not.toHaveBeenCalled();
		});
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

		it('accepts the thread provenance of the current runtime and rejects bad values', () => {
			const base = { threadId: THREAD_ID, projectId: PROJECT_ID };
			expect(
				InstanceAiAssistantEvalCreateThreadRequest.safeParse({
					...base,
					source: 'evals',
					sourceContext: { evalCase: 'slack-digest', evalIteration: 1 },
				}).success,
			).toBe(true);
			expect(
				InstanceAiAssistantEvalCreateThreadRequest.safeParse({ ...base, source: 'not-a-source' })
					.success,
			).toBe(false);
			expect(
				InstanceAiAssistantEvalCreateThreadRequest.safeParse({
					...base,
					sourceContext: { blob: 'x'.repeat(2048) },
				}).success,
			).toBe(false);
		});

		it.each([
			[{}, true],
			[{ promptVersion: 'v2' }, true],
			[{ promptVersion: '   ' }, false],
			[{ promptVersion: 'x'.repeat(129) }, false],
		])('validates overrides %j as %s', (body, valid) => {
			expect(InstanceAiAssistantEvalThreadOverridesRequest.safeParse(body).success).toBe(valid);
		});
	});
});
