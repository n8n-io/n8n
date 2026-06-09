import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { DesktopAssistantController } from '../desktop-assistant.controller';
import type { DesktopAssistantService } from '../desktop-assistant.service';
import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';

const routeMetadata = Container.get(ControllerRegistryMetadata);

function scopeOf(handlerName: string): { scope: Scope; globalOnly: boolean } | undefined {
	const route = routeMetadata.getRouteMetadata(
		DesktopAssistantController as unknown as Parameters<typeof routeMetadata.getRouteMetadata>[0],
		handlerName,
	);
	return route.accessScope;
}

describe('DesktopAssistantController', () => {
	const service = mock<DesktopAssistantService>();
	const settingsService = mock<InstanceAiSettingsService>();
	const controller = new DesktopAssistantController(service, settingsService);
	const user = mock<User>({ id: 'user-1' });
	const req = mock<AuthenticatedRequest>({ user });

	beforeEach(() => {
		jest.clearAllMocks();
		settingsService.isInstanceAiEnabled.mockReturnValue(true);
	});

	describe('access scopes', () => {
		test('every handler is guarded by instanceAi:message', () => {
			expect(scopeOf('getTasks')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
			expect(scopeOf('triggerTask')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
			expect(scopeOf('promoteThread')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
			expect(scopeOf('getHistory')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});
	});

	describe('Instance AI disabled', () => {
		beforeEach(() => settingsService.isInstanceAiEnabled.mockReturnValue(false));

		test('getTasks throws ForbiddenError', async () => {
			await expect(controller.getTasks(req)).rejects.toBeInstanceOf(ForbiddenError);
		});

		test('triggerTask throws ForbiddenError', async () => {
			await expect(controller.triggerTask(req, null, { prompt: 'hi' })).rejects.toBeInstanceOf(
				ForbiddenError,
			);
		});

		test('promoteThread throws ForbiddenError', async () => {
			await expect(controller.promoteThread(req, null, { threadId: 't-1' })).rejects.toBeInstanceOf(
				ForbiddenError,
			);
		});

		test('getHistory throws ForbiddenError', async () => {
			await expect(controller.getHistory(req, null, {})).rejects.toBeInstanceOf(ForbiddenError);
		});
	});

	describe('happy path delegation', () => {
		test('getTasks calls the service with the requesting user', async () => {
			service.getTasks.mockResolvedValue({
				actionNeeded: [],
				upcoming: [],
				readyToRun: [],
			});
			await controller.getTasks(req);
			expect(service.getTasks).toHaveBeenCalledWith(user);
		});

		test('triggerTask forwards the body to the service', async () => {
			service.triggerTask.mockResolvedValue({ threadId: 't-new', runId: 'r-new' });
			const result = await controller.triggerTask(req, null, {
				prompt: 'rename desktop files',
			});
			expect(service.triggerTask).toHaveBeenCalledWith(user, {
				prompt: 'rename desktop files',
			});
			expect(result).toEqual({ threadId: 't-new', runId: 'r-new' });
		});

		test('promoteThread forwards the body to the service', async () => {
			service.promoteThread.mockResolvedValue({
				status: 'building',
				threadId: 't-1',
				runId: 'r-1',
			});
			const result = await controller.promoteThread(req, null, { threadId: 't-1' });
			expect(service.promoteThread).toHaveBeenCalledWith(user, { threadId: 't-1' });
			expect(result).toEqual({ status: 'building', threadId: 't-1', runId: 'r-1' });
		});

		test('getHistory parses the limit query param', async () => {
			service.getHistory.mockResolvedValue({ results: [], count: 0, estimated: false });
			await controller.getHistory(req, null, { limit: '50', firstId: 'a', lastId: 'z' });
			expect(service.getHistory).toHaveBeenCalledWith(user, {
				limit: 50,
				firstId: 'a',
				lastId: 'z',
			});
		});
	});
});
