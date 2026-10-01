import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { routingExpectationText } from '../../routing/expectation';
import {
	expectedBehaviorSentence,
	exportedExpectations,
	isSyntheticSource,
	parsePassingIds,
	routingCaseDiff,
	routingCaseJsonFromExport,
	routingCasesFromExport,
	toLangTracerCreateBody,
	toLangTracerUpdateBody,
	unsupportedRoutingPushReason,
	type RoutingLangTracerCreateBody,
} from '../../routing/langtracer-cases';
import {
	langTracerConfigFromClaudeConfig,
	resolveRoutingLangTracerConfig,
} from '../../routing/langtracer-config';
import { parseRoutingPushArgs } from '../../routing/langtracer-push';
import { parseRoutingCase, type RoutingCase } from '../../routing/loader';

function routingCase(raw: Record<string, unknown>): RoutingCase {
	const parsed = parseRoutingCase({
		id: 'route-agent-support',
		bucket: 'agent',
		agentShaped: true,
		userMessage: 'Set up AI support in our group.',
		accepts: ['agent', 'clarify:agent'],
		policyDependent: false,
		source: 'suite-62:985',
		rationale: 'Ongoing conversational support role.',
		...raw,
	});
	if (!parsed.success) throw new Error(parsed.issues.join('; '));
	return parsed.data;
}

/** What the suite export returns for a pushed body: evalTags as `tags`, plus the stored content. */
function exportedBody(body: RoutingLangTracerCreateBody): Record<string, unknown> {
	return {
		complexity: body.evalComplexity,
		tags: body.evalTags,
		conversation: body.conversation,
		// A case with an expectation gets no synthesized happy-path scenario.
		executionScenarios: [],
		...(body.description ? { description: body.description } : {}),
		...(body.seed ? { seed: body.seed } : {}),
		processExpectations: body.processExpectations,
	};
}

const seeded = routingCase({
	id: 'route-debug-seeded',
	bucket: 'debug',
	agentShaped: false,
	accepts: ['debug', 'clarify'],
	source: 'langtracer:thread-1',
	seed: {
		mode: 'inline',
		workflows: [{ id: 'wf-seeded-0001', name: 'Sync', nodes: [], connections: {} }],
		messages: [{ role: 'user', text: 'Build a sync.' }],
		priorRuns: [{ workflow: 'wf-seeded-0001', hints: 'Sync failed' }],
	},
	attach: { workflow: 'wf-seeded-0001' },
	language: 'deu',
});

describe('toLangTracerCreateBody', () => {
	it('encodes the routing labels as tags, in the spec order', () => {
		const body = toLangTracerCreateBody(routingCase({ policyDependent: true }), {
			suiteId: 64,
			setKind: 'regression',
		});

		expect(body.evalTags).toEqual([
			'routing',
			'bucket:agent',
			'accepts:agent',
			'accepts:clarify:agent',
			'policy-dependent',
			'agent-shaped',
			'source:suite-62:985',
			'lang:eng',
		]);
		// LangTracer keeps only kebab-case case tags.
		expect(body.tags).toEqual(['routing', 'policy-dependent', 'agent-shaped']);
		expect(body).toMatchObject({
			name: 'route-agent-support',
			setKind: 'regression',
			synthetic: true,
			suiteId: 64,
			userPrompt: 'Set up AI support in our group.',
			description: 'Ongoing conversational support role.',
			conversation: [{ role: 'user', text: 'Set up AI support in our group.' }],
		});
		expect(body.expectedBehavior).toBe(
			'The Assistant should build an Agent or ask a clarifying question that points toward an Agent (accepted routes: agent, clarify:agent).',
		);
		expect(body.processExpectations).toEqual(['Routes to one of: agent, clarify:agent']);
		expect(body).not.toHaveProperty('outcomeExpectations');
	});

	it('carries the seed without folders and the attachment on the turn', () => {
		const body = toLangTracerCreateBody(seeded, { suiteId: 64, setKind: 'capability_gap' });
		expect(body.synthetic).toBe(false);
		expect(body.seed).not.toHaveProperty('folders');
		expect(body.seed?.priorRuns).toEqual([{ workflow: 'wf-seeded-0001', hints: 'Sync failed' }]);
		expect(body.conversation?.[0].attach).toEqual({ workflow: 'wf-seeded-0001' });
		expect(body.evalTags).toContain('lang:deu');
	});

	it('patches every routing field and clears an absent seed', () => {
		const body = toLangTracerCreateBody(routingCase({}), { suiteId: 64, setKind: 'regression' });
		const patch = toLangTracerUpdateBody(body);
		expect(patch).not.toHaveProperty('suiteId');
		expect(patch).not.toHaveProperty('synthetic');
		expect(patch).toMatchObject({
			seed: null,
			containsUserData: false,
			setKind: 'regression',
			processExpectations: [routingExpectationText(['agent', 'clarify:agent'])],
			outcomeExpectations: [],
		});
	});
});

describe('routing cases from a LangTracer export', () => {
	it('round-trips plain and seeded cases', () => {
		const plain = routingCase({});
		const files = Object.fromEntries(
			[plain, seeded].map((c) => [
				`${c.id}.json`,
				exportedBody(toLangTracerCreateBody(c, { suiteId: 64, setKind: 'regression' })),
			]),
		);

		const { cases, errors } = routingCasesFromExport(files);

		expect(errors).toEqual([]);
		expect(cases.map((c) => c.id)).toEqual(['route-agent-support', 'route-debug-seeded']);
		expect(routingCaseDiff(plain, cases[0])).toEqual([]);
		expect(routingCaseDiff(seeded, cases[1])).toEqual([]);
		expect(cases[1].attach).toEqual({ workflow: 'wf-seeded-0001' });
	});

	it('ignores the stored expectation and scenarios when it rebuilds a case', () => {
		const plain = routingCase({});
		const exported = {
			...exportedBody(toLangTracerCreateBody(plain, { suiteId: 64, setKind: 'regression' })),
			processExpectations: ['Routes to one of: workflow'],
			outcomeExpectations: ['An Agent was created.'],
			executionScenarios: [{ name: 'happy-path', description: '' }],
		};

		const { cases, errors } = routingCasesFromExport({ [`${plain.id}.json`]: exported });

		expect(errors).toEqual([]);
		expect(cases[0].accepts).toEqual(['agent', 'clarify:agent']);
		expect(routingCaseDiff(plain, cases[0])).toEqual([]);
	});

	it('reads the expectation lists of an export body, trimmed', () => {
		expect(
			exportedExpectations({ processExpectations: [' Routes to one of: answer ', ''] }),
		).toEqual({ process: ['Routes to one of: answer'], outcome: [] });
		expect(exportedExpectations(null)).toEqual({ process: [], outcome: [] });
	});

	it('names what is missing from a case that is not a routing case', () => {
		expect(routingCaseJsonFromExport('x', { tags: ['other'] })).toEqual({
			success: false,
			issues: ['no "routing" tag, so it is not a routing case'],
		});
		const { errors } = routingCasesFromExport({
			'route-a.json': { tags: ['routing', 'accepts:agent'], conversation: [] },
		});
		expect(errors).toEqual([
			'route-a: no "bucket:" tag; no "source:" tag; conversation must be exactly one user turn',
		]);
	});

	it('reports a changed field', () => {
		const changed = routingCase({ accepts: ['agent'] });
		expect(routingCaseDiff(routingCase({}), changed)).toEqual(['accepts']);
	});
});

describe('push helpers', () => {
	it('marks only the synthetic sources as synthetic', () => {
		expect(['suite-62:1', 'agent-344:x', 'discovery:y', 'synthetic'].every(isSyntheticSource)).toBe(
			true,
		);
		expect(['langtracer:t', 'michael-report', 'one-off-page'].some(isSyntheticSource)).toBe(false);
	});

	it('reads passing ids as an array or under a known key', () => {
		expect([...parsePassingIds(['a', 'b'])]).toEqual(['a', 'b']);
		expect([...parsePassingIds({ passingIds: ['a'] })]).toEqual(['a']);
		expect(() => parsePassingIds({ other: [] })).toThrow('passing ids must be');
	});

	it('refuses a case with instance state', () => {
		expect(
			unsupportedRoutingPushReason(routingCase({ instanceState: { folderExploration: true } })),
		).toContain('instanceState');
		expect(unsupportedRoutingPushReason(routingCase({}))).toBeNull();
	});

	it('describes one accepted route in one sentence', () => {
		expect(expectedBehaviorSentence(['answer'])).toBe(
			'The Assistant should answer the question (accepted routes: answer).',
		);
	});
});

describe('parseRoutingPushArgs', () => {
	const required = ['--suite', 'intent-routing', '--passing-ids', 'passing.json'];

	it('requires a cases directory', () => {
		expect(() => parseRoutingPushArgs(required)).toThrow('--cases-dir <dir> is required');
	});

	it('reads the cases directory and the selection', () => {
		expect(
			parseRoutingPushArgs([...required, '--cases-dir', 'cases', '--filter', 'agent', '--dry-run']),
		).toEqual({
			suite: 'intent-routing',
			passingIdsFile: 'passing.json',
			casesDir: 'cases',
			selection: { filter: 'agent' },
			dryRun: true,
		});
	});
});

describe('resolveRoutingLangTracerConfig', () => {
	it('prefers the environment', () => {
		expect(
			resolveRoutingLangTracerConfig(
				{ LANGTRACER_URL: 'https://lt.example', LANGTRACER_API_KEY: 'lt_env' },
				'/does/not/exist.json',
			),
		).toEqual({ baseUrl: 'https://lt.example', apiKey: 'lt_env' });
	});

	it('falls back to the lang-tracer MCP entry of the Claude config', () => {
		const dir = mkdtempSync(join(tmpdir(), 'routing-lt-config-'));
		const file = join(dir, 'claude.json');
		writeFileSync(
			file,
			JSON.stringify({
				mcpServers: {
					'lang-tracer': {
						url: 'https://lt.example/api/mcp',
						headers: { Authorization: 'Bearer lt_file' },
					},
				},
			}),
		);
		expect(resolveRoutingLangTracerConfig({}, file)).toEqual({
			baseUrl: 'https://lt.example/api',
			apiKey: 'lt_file',
		});
		expect(langTracerConfigFromClaudeConfig({ mcpServers: {} })).toBeUndefined();
		expect(() => resolveRoutingLangTracerConfig({}, join(dir, 'missing.json'))).toThrow(
			'LANGTRACER_URL',
		);
	});
});
