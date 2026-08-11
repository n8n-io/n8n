import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import {
	INSTANCE_ACTIVATED_SETTINGS_KEY,
	InstanceActivationService,
} from '@/services/instance-activation.service';

const settingsRow = (value: string) =>
	mock<Settings>({ key: INSTANCE_ACTIVATED_SETTINGS_KEY, value });

describe('InstanceActivationService', () => {
	const settingsRepository = mock<SettingsRepository>();
	let service: InstanceActivationService;

	beforeEach(() => {
		vi.resetAllMocks();
		service = new InstanceActivationService(settingsRepository);
	});

	describe('when the instance has not activated', () => {
		beforeEach(() => {
			settingsRepository.findByKey.mockResolvedValue(null);
		});

		it('reports not activated', async () => {
			await expect(service.isActivated()).resolves.toBe(false);
			await expect(service.getActivatedAt()).resolves.toBeUndefined();
		});

		// Deliberately not memoised: an instance can activate at any moment, so a negative answer
		// has to stay fresh.
		it('re-reads the row on every call', async () => {
			await service.isActivated();
			await service.isActivated();

			expect(settingsRepository.findByKey).toHaveBeenCalledTimes(2);
			expect(settingsRepository.findByKey).toHaveBeenCalledWith(INSTANCE_ACTIVATED_SETTINGS_KEY);
		});
	});

	describe('when the instance has activated', () => {
		it('reports the recorded timestamp', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				settingsRow(JSON.stringify({ workflowId: 'w1', timestamp: 1_700_000_000 })),
			);

			await expect(service.getActivatedAt()).resolves.toBe(1_700_000_000);
			await expect(service.isActivated()).resolves.toBe(true);
		});

		// Activation is monotonic, so the read is worth caching for the life of the process.
		it('reads the row only once', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				settingsRow(JSON.stringify({ timestamp: 1_700_000_000 })),
			);

			await service.getActivatedAt();
			await service.getActivatedAt();
			await service.isActivated();

			expect(settingsRepository.findByKey).toHaveBeenCalledTimes(1);
		});

		// The row's existence is the signal; a malformed value must not read as "never activated".
		it.each([['not json'], [JSON.stringify({})], [JSON.stringify({ timestamp: 'nope' })]])(
			'still reports activated for the unparseable value %p',
			async (value) => {
				settingsRepository.findByKey.mockResolvedValue(settingsRow(value));

				await expect(service.isActivated()).resolves.toBe(true);
				await expect(service.getActivatedAt()).resolves.toBe(0);
			},
		);
	});
});
