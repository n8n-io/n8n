import { GLOBAL_MEMBER_ROLE, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiThread } from '../../entities/instance-ai-thread.entity';
import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import { InstanceAiService } from '../../instance-ai.service';
import { AUTO_FOLLOW_UP_MESSAGE } from '../../internal-messages';
import type { InstanceAiThreadRepository } from '../../repositories/instance-ai-thread.repository';
import { SelfHealingChatService } from '../self-healing-chat.service';

vi.mock('../../instance-ai.service', () => ({ InstanceAiService: vi.fn() }));
vi.mock('../../instance-ai-settings.service', () => ({ InstanceAiSettingsService: vi.fn() }));

describe('SelfHealingChatService', () => {
	const user = mock<User>({ id: 'reviewer', disabled: false, role: GLOBAL_MEMBER_ROLE });
	const threads = mock<InstanceAiThreadRepository>();
	const settings = mock<InstanceAiSettingsService>();
	const assistant = mock<InstanceAiService>();
	const service = new SelfHealingChatService(threads, settings);

	beforeEach(() => {
		vi.resetAllMocks();
		Container.set(InstanceAiService, assistant);
		settings.isInstanceAiEnabled.mockReturnValue(true);
		settings.isModelConfigured.mockResolvedValue(true);
		settings.isSetupCompleted.mockResolvedValue(true);
		threads.getPersonalProjectForChat.mockResolvedValue(mock<Project>({ id: 'personal' }));
		threads.findOwnedSelfHealingChat.mockResolvedValue(mock<InstanceAiThread>({ id: 'chat' }));
		threads.hasUserTurnAfterOpening.mockResolvedValue(false);
		assistant.hasActiveRun.mockReturnValue(false);
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

	it.each(['isModelConfigured', 'isSetupCompleted'] as const)(
		'requires %s before creating a chat',
		async (check) => {
			settings[check].mockResolvedValue(false);
			await expect(service.assertAvailable(user)).rejects.toThrow(BadRequestError);
			expect(threads.getPersonalProjectForChat).not.toHaveBeenCalled();
		},
	);

	it('checks the personal project during readiness', async () => {
		await service.assertAvailable(user);
		expect(threads.getPersonalProjectForChat).toHaveBeenCalledWith(user.id, {});
	});

	it('starts a prepared chat through the normal Assistant runner', async () => {
		await service.start(user, 'chat');
		expect(assistant.startRun).toHaveBeenCalledWith(user, 'chat', AUTO_FOLLOW_UP_MESSAGE);
	});

	it('requires ownership before starting a prepared chat', async () => {
		threads.findOwnedSelfHealingChat.mockResolvedValue(null);
		await expect(service.start(user, 'chat')).rejects.toThrow(ForbiddenError);
		expect(threads.findOwnedSelfHealingChat).toHaveBeenCalledWith('chat', user.id);
		expect(assistant.startRun).not.toHaveBeenCalled();
	});

	it('does not repeat a run after another user turn is stored', async () => {
		threads.hasUserTurnAfterOpening.mockResolvedValue(true);
		await service.start(user, 'chat');
		expect(assistant.startRun).not.toHaveBeenCalled();
	});

	it('does not overlap an active run', async () => {
		assistant.hasActiveRun.mockReturnValue(true);
		await service.start(user, 'chat');
		expect(assistant.startRun).not.toHaveBeenCalled();
	});

	it('checks active state again after asynchronous readiness checks', async () => {
		assistant.hasActiveRun.mockReturnValueOnce(false).mockReturnValue(true);
		await service.start(user, 'chat');
		expect(assistant.startRun).not.toHaveBeenCalled();
	});

	it('can retry a refused run without creating another chat or opening message', async () => {
		assistant.startRun.mockImplementationOnce(() => {
			throw new BadRequestError('The Assistant is busy.');
		});
		await expect(service.start(user, 'chat')).rejects.toThrow('The Assistant is busy.');
		await service.start(user, 'chat');
		expect(assistant.startRun).toHaveBeenCalledTimes(2);
		expect(threads.createSelfHealingChat).not.toHaveBeenCalled();
	});
});
