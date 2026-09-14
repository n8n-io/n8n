import { SettingsRepository } from '@n8n/db';
import { BreakingChangeRuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import '../rules';
import type { IBreakingChangeRule } from '../types';

describe('Breaking change rules auto-discovery', () => {
	beforeAll(() => {
		// Some rules inject repositories that need a live DataSource. Provide a
		// mock so the container can resolve every rule without a database.
		Container.set(SettingsRepository, mock<SettingsRepository>());
	});

	it('should register all rules grouped by version', () => {
		const metadata = Container.get(BreakingChangeRuleMetadata);
		const entries = metadata.getEntries();

		expect(entries.filter((entry) => entry.version === 'v2')).toHaveLength(16);
		expect(entries.filter((entry) => entry.version === 'v3').length).toBeGreaterThanOrEqual(35);
		expect(entries.length).toBeGreaterThanOrEqual(50);
	});

	it('should resolve all registered rules with valid metadata from the DI container', () => {
		const metadata = Container.get(BreakingChangeRuleMetadata);

		for (const entry of metadata.getEntries()) {
			const rule = Container.get(entry.class) as IBreakingChangeRule;

			expect(rule.id).toBeTruthy();

			const ruleMetadata = rule.getMetadata();
			expect(ruleMetadata.version).toBe(entry.version);
			expect(ruleMetadata.title).toBeTruthy();
			expect(ruleMetadata.description).toBeTruthy();
			expect(ruleMetadata.category).toBeTruthy();
			expect(ruleMetadata.severity).toBeTruthy();
		}
	});

	it('should have unique rule IDs', () => {
		const metadata = Container.get(BreakingChangeRuleMetadata);
		const ids = metadata
			.getEntries()
			.map((entry) => (Container.get(entry.class) as IBreakingChangeRule).id);

		expect(new Set(ids).size).toBe(ids.length);
	});
});
