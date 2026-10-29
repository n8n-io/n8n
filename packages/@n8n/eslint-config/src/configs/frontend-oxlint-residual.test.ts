import { describe, expect, it } from 'vitest';

import { frontendConfig } from './frontend.js';
import { frontendOxlintResidualConfig } from './frontend-oxlint-residual.js';

describe('frontendOxlintResidualConfig', () => {
	it('preserves config entries that do not declare rules', () => {
		const index = frontendConfig.findIndex((config) => !config.rules);

		expect(index).toBeGreaterThanOrEqual(0);
		expect(frontendOxlintResidualConfig[index]).toBe(frontendConfig[index]);
	});

	it('keeps residual rules and disables Oxlint-owned rules', () => {
		const baseIndex = frontendConfig.findIndex((config) => config.rules?.['import-x/no-cycle']);
		const vueIndex = frontendConfig.findIndex(
			(config) => config.rules?.['vue/no-deprecated-slot-attribute'],
		);

		expect(frontendOxlintResidualConfig[baseIndex]?.rules?.['import-x/no-cycle']).toBe('off');
		expect(
			frontendOxlintResidualConfig[vueIndex]?.rules?.['vue/no-deprecated-slot-attribute'],
		).toBe('error');
	});
});
