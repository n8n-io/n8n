import { directNodeReplacementRules } from '../../../rules/v3/removed-nodes-with-replacements.rule';
import { nodeRemovalMigrations } from '../index';

describe('nodeRemovalMigrations', () => {
	const ruleIds = new Set(directNodeReplacementRules.map(({ rule }) => new rule().id));

	it('registers each rule once', () => {
		const migrationRuleIds = nodeRemovalMigrations.map(({ ruleId }) => ruleId);

		expect(new Set(migrationRuleIds).size).toBe(migrationRuleIds.length);
	});

	it('keys every migration to a rule that exists', () => {
		const known = new Set([
			...ruleIds,
			'ai-transform-deprecated',
			'edit-image-version-v3',
			'agent-node-version-v3',
		]);

		for (const { ruleId } of nodeRemovalMigrations) {
			expect(known, ruleId).toContain(ruleId);
		}
	});

	it('does not migrate nodes that cannot keep their configuration', () => {
		// See README.md in the migrations folder for the reason for each node.
		const notMigratable = [
			'function-removed-v3',
			'function-item-removed-v3',
			'convert-to-from-binary-data-removed-v3',
			'read-binary-file-removed-v3',
			'read-binary-files-removed-v3',
			'http-request-tool-removed-v3',
			'interval-removed-v3',
			'openai-removed-v3',
			'openai-assistant-removed-v3',
			'openai-model-removed-v3',
			'serpapi-google-search-removed-v3',
		];
		const migrated = new Set(nodeRemovalMigrations.map(({ ruleId }) => ruleId));

		for (const ruleId of notMigratable) {
			expect(ruleIds, ruleId).toContain(ruleId);
			expect(migrated.has(ruleId), ruleId).toBe(false);
		}
	});
});
