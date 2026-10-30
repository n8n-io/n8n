import { Container } from '@n8n/di';

import { SkillSyncConfig } from '../skill-sync.config';

describe('SkillSyncConfig', () => {
	beforeEach(() => {
		Container.reset();
		delete process.env.N8N_SKILL_SYNC_CHECK_INTERVAL_SECONDS;
	});

	afterAll(() => {
		delete process.env.N8N_SKILL_SYNC_CHECK_INTERVAL_SECONDS;
	});

	it('checks every hour by default', () => {
		expect(Container.get(SkillSyncConfig).checkIntervalSeconds).toBe(3600);
	});

	it('reads the interval from the environment', () => {
		process.env.N8N_SKILL_SYNC_CHECK_INTERVAL_SECONDS = '900';
		expect(Container.get(SkillSyncConfig).checkIntervalSeconds).toBe(900);
	});
});
