import type { InstanceAiThreadInfo } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import { ThreadSharingController } from '../thread-sharing.controller';
import type { ThreadSharingService } from '../thread-sharing.service';

const routeMetadata = Container.get(ControllerRegistryMetadata);
type ControllerClass = Parameters<typeof routeMetadata.getControllerMetadata>[0];

describe('ThreadSharingController', () => {
	const sharing = mock<ThreadSharingService>();
	const settingsService = mock<InstanceAiSettingsService>();
	const controller = new ThreadSharingController(sharing, settingsService);
	const req = mock<AuthenticatedRequest>({ user: { id: 'owner-1' } });
	const res = mock<Response>();

	beforeEach(() => {
		vi.clearAllMocks();
		settingsService.isInstanceAiEnabled.mockReturnValue(true);
	});

	it('exposes POST /instance-ai/threads/:threadId/share with the instanceAi:message scope', () => {
		const metadata = routeMetadata.getControllerMetadata(
			ThreadSharingController as unknown as ControllerClass,
		);
		const route = metadata.routes.get('shareThread');

		expect(metadata.basePath).toBe('/instance-ai');
		expect(route).toMatchObject({
			method: 'post',
			path: '/threads/:threadId/share',
			skipAuth: false,
			accessScope: { scope: 'instanceAi:message', globalOnly: true },
		});
	});

	it('shares the thread as the requesting user and returns the summary', async () => {
		const thread = mock<InstanceAiThreadInfo>({ id: 'thread-1' });
		sharing.share.mockResolvedValue(thread);

		await expect(controller.shareThread(req, res, 'thread-1')).resolves.toEqual({ thread });
		expect(sharing.share).toHaveBeenCalledWith(req.user, 'thread-1');
	});

	it('refuses when the Assistant is disabled', async () => {
		settingsService.isInstanceAiEnabled.mockReturnValue(false);

		await expect(controller.shareThread(req, res, 'thread-1')).rejects.toThrow(ForbiddenError);
		expect(sharing.share).not.toHaveBeenCalled();
	});
});
