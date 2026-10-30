import { AssistantThreadTabsRequestDto, type AssistantThreadTabsState } from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AssistantAgentController } from '../assistant-agent.controller';
import type { AssistantThreadTabsService } from '../assistant-thread-tabs.service';

const THREAD_ID = 'thread-1';

describe('AssistantAgentController', () => {
	const threadTabs = mock<AssistantThreadTabsService>();
	const controller = new AssistantAgentController(threadTabs);

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
		for (const handler of ['getThreadTabs', 'saveThreadTabs']) {
			expect(metadata.routes.get(handler)?.path).toBe('/threads/:threadId/tabs');
			expect(metadata.routes.get(handler)?.accessScope).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		}
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
});
