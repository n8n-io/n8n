import {
	AssistantAgentTargetRequestDto,
	AssistantThreadTabsRequestDto,
	InstanceAiPersistPendingAgentRequest,
	type AssistantAgentTargetsState,
	type AssistantThreadTabsState,
} from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AssistantAgentController } from '../assistant-agent.controller';
import type { AssistantAgentTargetsService } from '../assistant-agent-targets.service';
import type { AssistantThreadCreditsService } from '../assistant-thread-credits.service';
import type { AssistantThreadTabsService } from '../assistant-thread-tabs.service';

const THREAD_ID = 'thread-1';

describe('AssistantAgentController', () => {
	const threadTabs = mock<AssistantThreadTabsService>();
	const threadCredits = mock<AssistantThreadCreditsService>();
	const agentTargets = mock<AssistantAgentTargetsService>();
	const controller = new AssistantAgentController(threadTabs, threadCredits, agentTargets);

	const user = mock<User>({ id: 'user-1' });
	const req = mock<AuthenticatedRequest>({ user });
	const res = mock<Response>();

	const state: AssistantThreadTabsState = {
		tabs: [{ type: 'workflow', id: 'wf-1', name: 'Sync' }],
		closedTabs: [],
		activeTab: { type: 'workflow', id: 'wf-1' },
		previewOpen: true,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('serves the routes under /assistant with the instanceAi:message scope', () => {
		const registry = Container.get(ControllerRegistryMetadata);
		const metadata = registry.getControllerMetadata(
			AssistantAgentController as unknown as Parameters<typeof registry.getControllerMetadata>[0],
		);

		expect(metadata.basePath).toBe('/assistant');
		const paths = {
			getThreadTabs: '/threads/:threadId/tabs',
			saveThreadTabs: '/threads/:threadId/tabs',
			getAgentTargets: '/threads/:threadId/agent-targets',
			bindAgentTarget: '/threads/:threadId/agent-target',
			persistPendingAgent: '/threads/:threadId/agent',
		};
		for (const [handler, path] of Object.entries(paths)) {
			expect(metadata.routes.get(handler)?.path).toBe(path);
			expect(metadata.routes.get(handler)?.accessScope).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		}
		expect(metadata.routes.get('getThreadCredits')?.path).toBe('/threads/:threadId/credits');
		expect(metadata.routes.get('getThreadCredits')?.accessScope).toEqual({
			scope: 'instanceAi:message',
			globalOnly: true,
		});
	});

	describe('getThreadCredits', () => {
		it('returns the credit total of the thread', async () => {
			threadCredits.getTotal.mockResolvedValue(2.5);

			await expect(controller.getThreadCredits(req, res, THREAD_ID)).resolves.toEqual({
				creditsUsed: 2.5,
			});
			expect(threadCredits.getTotal).toHaveBeenCalledWith(user, THREAD_ID);
		});

		it('returns null before the first claim', async () => {
			threadCredits.getTotal.mockResolvedValue(undefined);

			await expect(controller.getThreadCredits(req, res, THREAD_ID)).resolves.toEqual({
				creditsUsed: null,
			});
		});

		it('rejects a thread that the user cannot use', async () => {
			threadCredits.getTotal.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(controller.getThreadCredits(req, res, THREAD_ID)).rejects.toThrow(NotFoundError);
		});
	});

	describe('getThreadTabs', () => {
		it('returns the stored tabs of the user', async () => {
			threadTabs.getState.mockResolvedValue(state);

			await expect(controller.getThreadTabs(req, res, THREAD_ID)).resolves.toEqual({ state });
			expect(threadTabs.getState).toHaveBeenCalledWith(user, THREAD_ID);
		});

		// The thread metadata service runs the access checks of the thread routes.
		it('rejects a thread that the user cannot use', async () => {
			threadTabs.getState.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(controller.getThreadTabs(req, res, THREAD_ID)).rejects.toThrow(NotFoundError);
		});
	});

	describe('saveThreadTabs', () => {
		it('stores the tabs of the user', async () => {
			const payload = new AssistantThreadTabsRequestDto(state);

			await expect(controller.saveThreadTabs(req, res, THREAD_ID, payload)).resolves.toEqual({
				state,
			});
			expect(threadTabs.saveState).toHaveBeenCalledWith(user, THREAD_ID, state);
		});

		it('rejects a thread that the user cannot use', async () => {
			threadTabs.saveState.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(
				controller.saveThreadTabs(req, res, THREAD_ID, new AssistantThreadTabsRequestDto(state)),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('agent targets', () => {
		const targets: AssistantAgentTargetsState = {
			bound: { agentId: 'agent-1', projectId: 'project-1', name: 'Triage' },
			pending: null,
			targets: [],
			previewSession: null,
		};

		it('returns the agent targets of the thread', async () => {
			agentTargets.getState.mockResolvedValue(targets);

			await expect(controller.getAgentTargets(req, res, THREAD_ID)).resolves.toEqual({ targets });
			expect(agentTargets.getState).toHaveBeenCalledWith(user, THREAD_ID);
		});

		it('binds the agent of the payload', async () => {
			agentTargets.bind.mockResolvedValue(targets);
			const payload = new AssistantAgentTargetRequestDto({
				agentId: 'agent-1',
				projectId: 'project-1',
				name: 'Triage',
			});

			await expect(controller.bindAgentTarget(req, res, THREAD_ID, payload)).resolves.toEqual({
				targets,
			});
			expect(agentTargets.bind).toHaveBeenCalledWith(user, THREAD_ID, {
				agentId: 'agent-1',
				projectId: 'project-1',
				name: 'Triage',
			});
		});

		it('saves the pending agent with the push ref of the request', async () => {
			const result = { agent: mock(), targets };
			agentTargets.persistPendingAgent.mockResolvedValue(
				result as Awaited<ReturnType<AssistantAgentTargetsService['persistPendingAgent']>>,
			);
			const payload = new InstanceAiPersistPendingAgentRequest({
				projectId: 'project-1',
				agentId: 'a1b2c3d4e5f6g7h8',
				name: 'New agent',
			});
			const pushReq = mock<AuthenticatedRequest>({ user, headers: { 'push-ref': 'push-1' } });

			await expect(controller.persistPendingAgent(pushReq, res, THREAD_ID, payload)).resolves.toBe(
				result,
			);
			expect(agentTargets.persistPendingAgent).toHaveBeenCalledWith(
				user,
				THREAD_ID,
				payload,
				'push-1',
			);
		});
	});
});
