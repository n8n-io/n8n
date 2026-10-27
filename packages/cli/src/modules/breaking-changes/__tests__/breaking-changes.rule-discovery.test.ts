import { CredentialsRepository, SettingsRepository } from '@n8n/db';
import { BreakingChangeRuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { assistantActionOf } from '../assistant-action';
import '../rules';
import { isWorkflowLevelRule, type IBreakingChangeRule } from '../types';

describe('Breaking change rules auto-discovery', () => {
	beforeAll(() => {
		// Some rules inject repositories that need a live DataSource. Provide a
		// mock so the container can resolve every rule without a database.
		Container.set(SettingsRepository, mock<SettingsRepository>());
		Container.set(CredentialsRepository, mock<CredentialsRepository>());
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
			expect(ruleMetadata.impact).toBeTruthy();
		}
	});

	it('should have unique rule IDs', () => {
		const metadata = Container.get(BreakingChangeRuleMetadata);
		const ids = metadata
			.getEntries()
			.map((entry) => (Container.get(entry.class) as IBreakingChangeRule).id);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it('should offer n8n Assistant only on the v3 workflow rules that opt in', () => {
		const metadata = Container.get(BreakingChangeRuleMetadata);
		const offered = Object.fromEntries(
			metadata
				.getEntries()
				.filter((entry) => entry.version === 'v3')
				.map((entry) => Container.get(entry.class) as IBreakingChangeRule)
				.filter(isWorkflowLevelRule)
				.map((rule) => [rule.id, assistantActionOf(rule)])
				.filter(([, action]) => action !== 'none'),
		);

		// A rule opts in only when the Assistant can make or explain the change inside the
		// workflow. Every other rule offers no Assistant.
		expect(offered).toEqual({
			'agent-node-version-v3': 'fix',
			'agent-removed-modes-v3': 'fix',
			'ai-transform-deprecated': 'fix',
			'chat-messages-retriever-removed-v3': 'fix',
			'cron-removed-v3': 'fix',
			'function-item-removed-v3': 'fix',
			'function-removed-v3': 'fix',
			'get-paired-item-v3': 'fix',
			'html-extract-removed-v3': 'fix',
			'http-request-tool-removed-v3': 'fix',
			'interval-removed-v3': 'fix',
			'item-lists-removed-v3': 'fix',
			'manual-chat-trigger-removed-v3': 'fix',
			'openai-model-removed-v3': 'fix',
			'openai-removed-v3': 'fix',
			'read-binary-file-removed-v3': 'fix',
			'read-binary-files-removed-v3': 'fix',
			'read-pdf-removed-v3': 'fix',
			'workflow-trigger-removed-v3': 'fix',
			'always-output-data-multi-output-v3': 'review',
			'gmail-trigger-version-v3': 'review',
			'removed-nodes-v3': 'review',
		});
	});
});
