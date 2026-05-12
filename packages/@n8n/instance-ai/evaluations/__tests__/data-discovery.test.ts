/**
 * Smoke + shape tests for the discovery scenario loader.
 *
 * Loads every JSON in evaluations/data/discovery/ off disk, parses it, and
 * asserts the shape required by `runExpectedToolsInvokedCheck`. Catches
 * malformed scenario files at unit-test time before they reach the eval
 * runner.
 */

import { loadDiscoveryTestCasesWithFiles } from '../data/discovery';
import { runExpectedToolsInvokedCheck } from '../discovery/expected-tools-invoked';

describe('loadDiscoveryTestCasesWithFiles', () => {
	const cases = loadDiscoveryTestCasesWithFiles();

	it('finds at least the v1 scenario set', () => {
		const slugs = cases.map((c) => c.fileSlug).sort();

		expect(slugs).toEqual(
			expect.arrayContaining([
				'slack-oauth-credential-setup',
				'google-oauth-credential-setup',
				'screenshot-dashboard',
				'http-node-config-no-browser',
				'oauth-with-computer-use-disabled',
			]),
		);
	});

	it.each([
		'slack-oauth-credential-setup',
		'google-oauth-credential-setup',
		'screenshot-dashboard',
		'http-node-config-no-browser',
		'oauth-with-computer-use-disabled',
	])('%s parses with a valid expectedToolInvocations rule', (slug) => {
		const entry = cases.find((c) => c.fileSlug === slug);
		expect(entry).toBeDefined();

		const { testCase } = entry!;

		expect(testCase.id).toBe(slug);
		expect(testCase.userMessage.length).toBeGreaterThan(0);

		// Calling the check with an empty outcome must not throw on rule validation;
		// it should simply report pass/fail. This pins the JSON shape.
		expect(() =>
			runExpectedToolsInvokedCheck(testCase, {
				workflowIds: [],
				executionIds: [],
				dataTableIds: [],
				finalText: '',
				toolCalls: [],
				agentActivities: [],
			}),
		).not.toThrow();
	});

	it('keeps positive and negative scenarios in the set (so we test both directions)', () => {
		const positive = cases.filter((c) => Boolean(c.testCase.expectedToolInvocations.anyOf?.length));
		const negative = cases.filter((c) =>
			Boolean(c.testCase.expectedToolInvocations.noneOf?.length),
		);

		expect(positive.length).toBeGreaterThan(0);
		expect(negative.length).toBeGreaterThan(0);
	});
});
