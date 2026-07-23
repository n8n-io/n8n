/**
 * Smoke + shape tests for the discovery scenario loader.
 *
 * Loads every JSON in evaluations/data/discovery/ off disk, parses it, and
 * asserts the shape required by `runExpectedToolsInvokedCheck`. Catches
 * malformed scenario files at unit-test time before they reach the eval
 * runner.
 */

import { discoveryTestCaseSchema, loadDiscoveryTestCasesWithFiles } from '../data/discovery';
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
				'workflow-builder-no-credential-ask',
			]),
		);
	});

	it.each([
		'slack-oauth-credential-setup',
		'google-oauth-credential-setup',
		'screenshot-dashboard',
		'http-node-config-no-browser',
		'oauth-with-computer-use-disabled',
		'workflow-builder-no-credential-ask',
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
				artifactRefs: [],
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

describe('discoveryTestCaseSchema', () => {
	const valid = {
		id: 'my-scenario',
		userMessage: 'do the thing',
		expectedToolInvocations: { anyOf: ['build-workflow'] },
	};

	it('accepts a minimal valid case', () => {
		expect(discoveryTestCaseSchema.safeParse(valid).success).toBe(true);
	});

	it('rejects a typo-d key instead of passing vacuously', () => {
		const typo = { ...valid, expectedToolInvocation: { anyOf: ['x'] } };
		expect(discoveryTestCaseSchema.safeParse(typo).success).toBe(false);
	});

	it('rejects empty expectations — a case must assert something', () => {
		const empty = { ...valid, expectedToolInvocations: {} };
		expect(discoveryTestCaseSchema.safeParse(empty).success).toBe(false);
	});

	it('rejects an empty expectation list — dead config must fail at load time', () => {
		const emptyList = { ...valid, expectedToolInvocations: { allOfToolCalls: [] } };
		expect(discoveryTestCaseSchema.safeParse(emptyList).success).toBe(false);
	});

	it.each([
		['connected with capabilities', { status: 'connected', capabilities: ['screenshot'] }, true],
		['connected without capabilities', { status: 'connected' }, false],
		['disabled', { status: 'disabled' }, true],
		['an unknown status', { status: 'on-fire' }, false],
	])('validates instanceState.localGateway strictly: %s', (_name, localGateway, ok) => {
		const withGateway = { ...valid, instanceState: { localGateway } };
		expect(discoveryTestCaseSchema.safeParse(withGateway).success).toBe(ok);
	});
});
