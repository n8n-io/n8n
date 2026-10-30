import { AssistantThreadTabsRequestDto, type AssistantThreadTabsState } from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import type { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';

import { AssistantController } from '../assistant.controller';
import type { AssistantThreadTabsService } from '../assistant-thread-tabs.service';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

const THREAD_ID = 'thread-1';

describe('AssistantController', () => {
	const systemAgents = mock<SystemAgentExecutionService>();
	const threadTabs = mock<AssistantThreadTabsService>();
	const controller = new AssistantController(systemAgents, threadTabs);

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
		systemAgents.getUsableThread.mockResolvedValue(mock<AgentExecutionThread>({ id: THREAD_ID }));
	});

	it('serves the routes under /assistant with the instanceAi:message scope', () => {
		const registry = Container.get(ControllerRegistryMetadata);
		const metadata = registry.getControllerMetadata(
			AssistantController as unknown as Parameters<typeof registry.getControllerMetadata>[0],
		);

		expect(metadata.basePath).toBe('/assistant');
		for (const handler of ['getThreadTabs', 'saveThreadTabs']) {
			expect(metadata.routes.get(handler)?.path).toBe('/agent-threads/:threadId/tabs');
			expect(metadata.routes.get(handler)?.accessScope).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		}
	});

	describe('getThreadTabs', () => {
		it('checks access to the Assistant thread and returns the stored tabs', async () => {
			threadTabs.getState.mockResolvedValue(state);

			await expect(controller.getThreadTabs(req, res, THREAD_ID)).resolves.toEqual({ state });
			expect(systemAgents.getUsableThread).toHaveBeenCalledWith(
				ASSISTANT_AGENT_ID,
				user,
				THREAD_ID,
			);
			expect(threadTabs.getState).toHaveBeenCalledWith(THREAD_ID);
		});

		it('does not read the tabs when the user cannot use the thread', async () => {
			systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(controller.getThreadTabs(req, res, THREAD_ID)).rejects.toThrow(NotFoundError);
			expect(threadTabs.getState).not.toHaveBeenCalled();
		});
	});

	describe('saveThreadTabs', () => {
		it('checks access to the Assistant thread and stores the tabs', async () => {
			const payload = new AssistantThreadTabsRequestDto(state);

			await expect(controller.saveThreadTabs(req, res, THREAD_ID, payload)).resolves.toEqual({
				state,
			});
			expect(systemAgents.getUsableThread).toHaveBeenCalledWith(
				ASSISTANT_AGENT_ID,
				user,
				THREAD_ID,
			);
			expect(threadTabs.saveState).toHaveBeenCalledWith(THREAD_ID, state);
		});

		it('does not store the tabs when the user cannot use the thread', async () => {
			systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(
				controller.saveThreadTabs(req, res, THREAD_ID, new AssistantThreadTabsRequestDto(state)),
			).rejects.toThrow(NotFoundError);
			expect(threadTabs.saveState).not.toHaveBeenCalled();
		});
	});
});
