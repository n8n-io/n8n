import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DateTime, Settings } from 'luxon';

import { createGetEnvironmentTool } from '../environment-tool';

describe('createGetEnvironmentTool', () => {
	const FIXED_NOW_MS = DateTime.fromISO('2026-05-05T14:32:11.000Z', { zone: 'utc' }).toMillis();

	beforeEach(() => {
		Settings.now = () => FIXED_NOW_MS;
		Container.set(GlobalConfig, { generic: { timezone: 'America/New_York' } } as GlobalConfig);
	});

	afterEach(() => {
		Settings.now = () => Date.now();
		Container.reset();
	});

	function makeCtx() {
		return {
			parentTelemetry: undefined,
		};
	}

	it('builds a tool with the correct name', () => {
		const tool = createGetEnvironmentTool().build();
		expect(tool.name).toBe('get_environment');
	});

	it('returns now in the instance timezone with offset', async () => {
		const tool = createGetEnvironmentTool().build();

		const result = (await tool.handler!({}, makeCtx())) as {
			now: string;
			timezone: string;
			dayOfWeek: string;
		};

		// 14:32:11Z in America/New_York (DST) = 10:32:11-04:00
		expect(result.now).toBe('2026-05-05T10:32:11.000-04:00');
		expect(result.timezone).toBe('America/New_York');
		expect(result.dayOfWeek).toBe('Tuesday');
	});

	it('reflects a different configured timezone', async () => {
		Container.set(GlobalConfig, { generic: { timezone: 'Asia/Tokyo' } } as GlobalConfig);

		const tool = createGetEnvironmentTool().build();
		const result = (await tool.handler!({}, makeCtx())) as {
			now: string;
			timezone: string;
			dayOfWeek: string;
		};

		// 14:32:11Z in Asia/Tokyo = 23:32:11+09:00
		expect(result.now).toBe('2026-05-05T23:32:11.000+09:00');
		expect(result.timezone).toBe('Asia/Tokyo');
		expect(result.dayOfWeek).toBe('Tuesday');
	});

	it('reads timezone at handler time, not creation time', async () => {
		const tool = createGetEnvironmentTool().build();

		// Mutate config after the tool is built; the handler must pick up the change.
		Container.set(GlobalConfig, { generic: { timezone: 'Europe/London' } } as GlobalConfig);

		const result = (await tool.handler!({}, makeCtx())) as { timezone: string };
		expect(result.timezone).toBe('Europe/London');
	});
});
