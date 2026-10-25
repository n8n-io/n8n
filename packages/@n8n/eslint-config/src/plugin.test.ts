import { describe, it, expect } from 'vitest';
import { frontendConfig } from './configs/frontend.js';
import { localRulesPlugin } from './plugin.js';

describe('localRulesPlugin recommended config', () => {
	it('enables the AWS credential-discovery import ban as an error', () => {
		expect(
			localRulesPlugin.configs.recommended.rules[
				'n8n-local-rules/no-aws-credential-discovery-imports'
			],
		).toBe('error');
	});
});

describe('frontendConfig', () => {
	it('enables the design-system import bans as errors', () => {
		const rules = frontendConfig.find(
			(config) => config.rules?.['n8n-local-rules/no-reka-ui-pagination'] !== undefined,
		)?.rules;

		for (const ruleName of [
			'n8n-local-rules/no-element-plus-menu',
			'n8n-local-rules/no-reka-ui-checkbox',
			'n8n-local-rules/no-reka-ui-combobox',
			'n8n-local-rules/no-reka-ui-date-range-picker',
			'n8n-local-rules/no-reka-ui-dialog',
			'n8n-local-rules/no-reka-ui-editable',
			'n8n-local-rules/no-reka-ui-number-field',
			'n8n-local-rules/no-reka-ui-pagination',
			'n8n-local-rules/no-reka-ui-popover',
			'n8n-local-rules/no-reka-ui-radio-group',
			'n8n-local-rules/no-reka-ui-scroll-area',
			'n8n-local-rules/no-reka-ui-select',
			'n8n-local-rules/no-reka-ui-switch',
			'n8n-local-rules/no-reka-ui-tags-input',
			'n8n-local-rules/no-reka-ui-toggle',
			'n8n-local-rules/no-reka-ui-tooltip',
			'n8n-local-rules/no-reka-ui-tree',
		]) {
			expect(rules?.[ruleName]).toBe('error');
		}
	});
});
