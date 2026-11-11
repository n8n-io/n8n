import { Container } from '@n8n/di';

import { InsightsConfig } from '../insights.config';

describe('InsightsConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_INSIGHTS_PRUNE_CHECK_INTERVAL_HOURS;
		delete process.env.N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES;
	});

	it('reads the cadences from their environment variables', () => {
		process.env.N8N_INSIGHTS_PRUNE_CHECK_INTERVAL_HOURS = '6';
		process.env.N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES = '0.5';

		const config = Container.get(InsightsConfig);

		expect(config.pruneCheckIntervalHours).toBe(6);
		expect(config.compactionIntervalMinutes).toBe(0.5);
	});

	it.each(['0', '-1', 'abc', 'Infinity'])(
		'falls back to the default prune-check cadence when given %s',
		(value) => {
			process.env.N8N_INSIGHTS_PRUNE_CHECK_INTERVAL_HOURS = value;

			expect(Container.get(InsightsConfig).pruneCheckIntervalHours).toBe(24);
		},
	);

	it.each(['0', '-1', 'abc', 'Infinity'])(
		'falls back to the default compaction cadence when given %s',
		(value) => {
			process.env.N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES = value;

			expect(Container.get(InsightsConfig).compactionIntervalMinutes).toBe(60);
		},
	);
});
