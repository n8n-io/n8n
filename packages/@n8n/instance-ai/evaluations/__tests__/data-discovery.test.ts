/**
 * Smoke + shape tests for the discovery scenario loader.
 *
 * Loads every JSON in evaluations/data/discovery/ off disk, parses it, and
 * asserts the shape required by `runExpectedToolsInvokedCheck`. Catches
 * malformed scenario files at unit-test time before they reach the eval
 * runner.
 */

import type { InstanceAiEvalFailedExecutionEnvelope } from '@n8n/api-types';

import { discoveryTestCaseSchema, loadDiscoveryTestCasesWithFiles } from '../data/discovery';
import { runExpectedToolsInvokedCheck } from '../discovery/expected-tools-invoked';

const recordedEnvelope: InstanceAiEvalFailedExecutionEnvelope = {
	format: 'n8n-instance-ai-failed-execution',
	version: 1,
	source: {
		executionId: '42',
		workflowId: 'source-wf',
		workflowVersionId: null,
		createdAt: '2026-10-20T06:00:00.000Z',
		startedAt: '2026-10-20T06:00:00.000Z',
		stoppedAt: '2026-10-20T06:00:05.000Z',
	},
	execution: { mode: 'trigger', status: 'error', finished: false, workflowData: {}, data: '[{}]' },
};

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
				'oauth-with-browser-use-disabled',
				'workflow-builder-no-credential-ask',
				'folder-scoped-workflow-list',
			]),
		);
	});

	it.each([
		'slack-oauth-credential-setup',
		'google-oauth-credential-setup',
		'screenshot-dashboard',
		'http-node-config-no-browser',
		'oauth-with-browser-use-disabled',
		'workflow-builder-no-credential-ask',
		'folder-scoped-workflow-list',
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
		expectedToolInvocations: { anyOf: ['workflow_builder_build_workflow'] },
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
		['connected', { status: 'connected' }, true],
		['disconnected', { status: 'disconnected' }, true],
		['unavailable', { status: 'unavailable' }, true],
		['connected with tool categories', { status: 'connected', toolCategories: ['browser'] }, false],
		['an unknown status', { status: 'on-fire' }, false],
	])('validates the browserUse state strictly: %s', (_name, browserUse, ok) => {
		const withState = { ...valid, instanceState: { browserUse } };
		expect(discoveryTestCaseSchema.safeParse(withState).success).toBe(ok);
	});

	it('accepts an inline seed with workflows the stub instance serves', () => {
		const seeded = {
			...valid,
			seed: {
				mode: 'inline',
				workflows: [{ id: 'wf-seeded-1', name: 'Seeded', nodes: [], connections: {} }],
			},
		};
		expect(discoveryTestCaseSchema.safeParse(seeded).success).toBe(true);
	});

	it('rejects a replay seed', () => {
		const replay = { ...valid, seed: { mode: 'replay', threadId: 'thread-1' } };
		expect(discoveryTestCaseSchema.safeParse(replay).success).toBe(false);
	});

	it.each([
		['folders', { folders: [{ id: 'folder-0001', name: 'Reports' }] }],
		['projects', { projects: [{ name: 'Foobar' }] }],
		[
			'recordedRuns',
			{
				workflows: [{ id: 'wf-seeded-1', name: 'Seeded', nodes: [], connections: {} }],
				recordedRuns: [{ workflow: 'wf-seeded-1', envelope: recordedEnvelope }],
			},
		],
	])('rejects an inline seed with %s, which the stub instance cannot serve', (slot, extra) => {
		const unsupported = { ...valid, seed: { mode: 'inline', ...extra } };
		const parsed = discoveryTestCaseSchema.safeParse(unsupported);
		expect(parsed.success).toBe(false);
		expect(parsed.error?.issues.map((issue) => issue.path.join('.'))).toContain(`seed.${slot}`);
	});

	it('rejects the retired computerUse key instead of passing vacuously', () => {
		const retired = {
			...valid,
			instanceState: { computerUse: { browser: { status: 'disconnected' } } },
		};
		expect(discoveryTestCaseSchema.safeParse(retired).success).toBe(false);
	});
});
