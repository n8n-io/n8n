import { Container } from '@n8n/di';

import { BreakingChangeRuleMetadata } from '../breaking-changes.rule-metadata.service';
import '../rules';
import type { IBreakingChangeRule } from '../types';

describe('Breaking change rules auto-discovery', () => {
	it('should register all rules', () => {
		const metadata = Container.get(BreakingChangeRuleMetadata);
		expect(metadata.getEntries().length).toBeGreaterThan(0);
	});

	it('should resolve all registered rules with valid metadata from the DI container', () => {
		const metadata = Container.get(BreakingChangeRuleMetadata);

		for (const entry of metadata.getEntries()) {
			const rule = Container.get<IBreakingChangeRule>(entry.class);

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
			.map((entry) => Container.get<IBreakingChangeRule>(entry.class).id);

		expect(new Set(ids).size).toBe(ids.length);
	});
});
