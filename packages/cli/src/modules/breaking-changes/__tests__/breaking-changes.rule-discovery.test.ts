import { BreakingChangeRuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import '../rules';
import type { IBreakingChangeRule } from '../types';

describe('Breaking change rules auto-discovery', () => {
	it('should register all 16 v2 rules', () => {
		const metadata = Container.get(BreakingChangeRuleMetadata);
		expect(metadata.getEntries()).toHaveLength(16);
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
