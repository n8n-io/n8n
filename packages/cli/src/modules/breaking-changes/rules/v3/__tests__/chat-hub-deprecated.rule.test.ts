import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ChatHubDeprecatedRule } from '../chat-hub-deprecated.rule';

describe('ChatHubDeprecatedRule', () => {
	const settingsRepository = mock<SettingsRepository>();

	const rule = new ChatHubDeprecatedRule(settingsRepository);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('detect()', () => {
		it('should not be affected when the setting is missing', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			const result = await rule.detect();

			expect(settingsRepository.findByKey).toHaveBeenCalledWith('chat.access.enabled');
			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
			expect(result.recommendations).toHaveLength(0);
		});

		it('should not be affected when chat hub is off', async () => {
			settingsRepository.findByKey.mockResolvedValue(mock<Settings>({ value: 'false' }));

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
			expect(result.recommendations).toHaveLength(0);
		});

		it('should be affected when chat hub is on', async () => {
			settingsRepository.findByKey.mockResolvedValue(mock<Settings>({ value: 'true' }));

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
			expect(result.recommendations[0].description).toContain('N8N_ENABLED_MODULES');
		});
	});
});
