import type { AiConfig } from '@n8n/config';

import { modelStreamStallOptions } from '../model-stream-stall-options';

function aiConfig(values: Partial<AiConfig>): AiConfig {
	return values as AiConfig;
}

describe('modelStreamStallOptions', () => {
	it('omits both keys when the config leaves them unset, so runtime defaults apply', () => {
		expect(modelStreamStallOptions(aiConfig({}))).toEqual({});
	});

	it('passes configured values through', () => {
		expect(
			modelStreamStallOptions(
				aiConfig({ modelStreamIdleTimeoutMs: 300_000, modelStreamFirstOutputTimeoutMs: 600_000 }),
			),
		).toEqual({ modelStreamIdleTimeoutMs: 300_000, modelStreamFirstOutputTimeoutMs: 600_000 });
	});

	it('keeps 0 for the idle timeout (disables the watchdog)', () => {
		expect(modelStreamStallOptions(aiConfig({ modelStreamIdleTimeoutMs: 0 }))).toEqual({
			modelStreamIdleTimeoutMs: 0,
		});
	});

	it('ignores 0 for the first-output timeout — it cannot disable, only shorten', () => {
		expect(modelStreamStallOptions(aiConfig({ modelStreamFirstOutputTimeoutMs: 0 }))).toEqual({});
	});

	it('ignores negative and non-finite values', () => {
		expect(
			modelStreamStallOptions(
				aiConfig({ modelStreamIdleTimeoutMs: -1, modelStreamFirstOutputTimeoutMs: NaN }),
			),
		).toEqual({});
	});

	it('ignores non-number values, e.g. proxies from auto-mocked configs', () => {
		expect(
			modelStreamStallOptions(aiConfig({ modelStreamIdleTimeoutMs: vi.fn() as unknown as number })),
		).toEqual({});
	});
});
