import { GLOBAL_MEMBER_ROLE, type Project, type User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import type { InstanceAiThreadRepository } from '../../repositories/instance-ai-thread.repository';
import { SelfHealingChatService } from '../self-healing-chat.service';

vi.mock('../../instance-ai-settings.service', () => ({ InstanceAiSettingsService: vi.fn() }));

describe('SelfHealingChatService', () => {
	const user = mock<User>({ id: 'reviewer', disabled: false, role: GLOBAL_MEMBER_ROLE });
	const threads = mock<InstanceAiThreadRepository>();
	const settings = mock<InstanceAiSettingsService>();
	const service = new SelfHealingChatService(threads, settings);

	beforeEach(() => {
		vi.resetAllMocks();
		settings.isInstanceAiEnabled.mockReturnValue(true);
		threads.getPersonalProjectForChat.mockResolvedValue(mock<Project>({ id: 'personal' }));
	});

	it('requires an enabled account with Assistant message access', async () => {
		await expect(service.assertAvailable(mock<User>({ ...user, disabled: true }))).rejects.toThrow(
			ForbiddenError,
		);
		await expect(
			service.assertAvailable(mock<User>({ ...user, role: { ...user.role, scopes: [] } })),
		).rejects.toThrow(ForbiddenError);
		expect(threads.getPersonalProjectForChat).not.toHaveBeenCalled();
	});

	it('requires an enabled Assistant', async () => {
		settings.isInstanceAiEnabled.mockReturnValue(false);
		await expect(service.assertAvailable(user)).rejects.toThrow(ForbiddenError);
	});

	it('allows opening the saved report before model setup is complete', async () => {
		settings.isModelConfigured.mockResolvedValue(false);
		settings.isSetupCompleted.mockResolvedValue(false);
		await expect(service.assertAvailable(user)).resolves.toBeUndefined();
	});

	it('requires the personal project before applying changes', async () => {
		threads.getPersonalProjectForChat.mockRejectedValue(new Error('Personal project unavailable.'));
		await expect(service.assertAvailable(user)).rejects.toThrow('Personal project unavailable.');
	});
});
