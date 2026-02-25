import { Container } from '@n8n/di';
import glob from 'fast-glob';
import { resolve } from 'node:path';

import { BreakingChangeRuleMetadata } from '../breaking-changes.rule-metadata.service';
import { loadAllRules } from '../rules';
import type { IBreakingChangeRule } from '../types';

const rulesDir = resolve(__dirname, '../rules');

describe('Breaking change rules auto-discovery', () => {
	let ruleFiles: string[];

	beforeAll(async () => {
		ruleFiles = await glob('./**/*.rule.ts', {
			ignore: ['**/__tests__/**'],
			cwd: rulesDir,
		});

		await loadAllRules();
	});

	it('should register one rule per rule file', () => {
		const metadata = Container.get(BreakingChangeRuleMetadata);
		expect(metadata.getEntries()).toHaveLength(ruleFiles.length);
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
