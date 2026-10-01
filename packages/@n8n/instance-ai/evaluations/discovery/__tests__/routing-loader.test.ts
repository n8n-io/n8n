import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	isRoutingCaseSelected,
	loadRoutingCases,
	parseRoutingCase,
	toDiscoveryScenario,
} from '../../routing/loader';

const workflow = {
	id: 'wf-seeded-01',
	name: 'Daily digest',
	nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' }],
	connections: {},
};

const agent = {
	id: 'agent-seeded-01',
	config: { name: 'Helper', model: 'anthropic/claude-sonnet-4-5', instructions: 'Be helpful.' },
};

function baseCase(overrides: Record<string, unknown> = {}) {
	return {
		id: 'route-debug-seeded',
		bucket: 'debug',
		userMessage: 'It failed again.',
		accepts: ['debug', 'clarify'],
		source: 'synthetic',
		...overrides,
	};
}

function issuesOf(raw: unknown): string[] {
	const parsed = parseRoutingCase(raw);
	return parsed.success ? [] : parsed.issues;
}

describe('routing case schema', () => {
	it('accepts seed, attach, and language, and hands seed and attach to the runner', () => {
		const parsed = parseRoutingCase(
			baseCase({
				seed: {
					mode: 'inline',
					workflows: [workflow],
					agents: [agent],
					messages: [{ role: 'user', text: 'Build me a digest.' }],
					priorRuns: [{ workflow: 'wf-seeded-01', hints: 'Start failed' }],
				},
				attach: { workflow: 'wf-seeded-01' },
				language: 'deu',
			}),
		);
		if (!parsed.success) throw new Error(parsed.issues.join('; '));

		const scenario = toDiscoveryScenario(parsed.data);
		expect(scenario.attach).toEqual({ workflow: 'wf-seeded-01' });
		expect(scenario.seed?.workflows.map((w) => w.id)).toEqual(['wf-seeded-01']);
		expect(scenario.seed?.priorRuns).toEqual([{ workflow: 'wf-seeded-01', hints: 'Start failed' }]);
		// The `{role, text}` shorthand becomes a full stored message.
		expect(scenario.seed?.messages[0]).toMatchObject({
			type: 'llm',
			role: 'user',
			content: [{ type: 'text', text: 'Build me a digest.' }],
		});
		expect(parsed.data.language).toBe('deu');
	});

	it('keeps an unseeded case unchanged', () => {
		const parsed = parseRoutingCase(baseCase());
		if (!parsed.success) throw new Error(parsed.issues.join('; '));
		expect(toDiscoveryScenario(parsed.data)).toEqual({
			id: 'route-debug-seeded',
			userMessage: 'It failed again.',
		});
	});

	it('refuses an attachment that names no seeded resource', () => {
		expect(issuesOf(baseCase({ attach: { workflow: 'wf-missing-01' } }))).toEqual([
			'attach.workflow: must be the id of a workflow in `seed.workflows`',
		]);
		expect(
			issuesOf(
				baseCase({
					seed: { mode: 'inline', workflows: [workflow] },
					attach: { agent: 'agent-missing-01' },
				}),
			),
		).toEqual(['attach.agent: must be the id of an Agent in `seed.agents`']);
	});

	it('refuses a prior run of a workflow the seed does not declare', () => {
		expect(
			issuesOf(
				baseCase({
					seed: {
						mode: 'inline',
						workflows: [workflow],
						priorRuns: [{ workflow: 'wf-missing-01' }],
					},
				}),
			),
		).toEqual(['seed.priorRuns.0.workflow: must be the id of a workflow in `seed.workflows`']);
	});

	it('refuses seed slots the stub instance cannot serve', () => {
		const issues = issuesOf(
			baseCase({
				seed: {
					mode: 'inline',
					workflows: [{ ...workflow, id: 'short' }],
					folders: [{ id: 'folder-seeded-01', name: 'Clients' }],
					projects: [{ name: 'Other' }],
				},
			}),
		);
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.stringContaining('seed.folders'),
				expect.stringContaining('seed.projects'),
				expect.stringContaining('seed.workflows.0.id'),
			]),
		);
		expect(issuesOf(baseCase({ seed: { mode: 'replay', threadId: 't-1' } }))).toEqual([
			'seed.mode: routing cases support only `mode: "inline"` seeds',
		]);
		expect(issuesOf(baseCase({ seed: { mode: 'inline' } }))).toEqual([
			'seed: an inline seed must carry messages, workflows, agents, or dataTables',
		]);
	});

	it('accepts a file-name id only for an imported case', () => {
		const raw = baseCase({ id: 'lt-route-debug-seeded-1a2b3c4d' });
		expect(issuesOf(raw)).toEqual(['id: id must look like route-<bucket>-<slug>']);
		expect(parseRoutingCase(raw, { imported: true }).success).toBe(true);
		expect(parseRoutingCase(baseCase({ id: '../escape' }), { imported: true })).toEqual({
			success: false,
			issues: ['id: id must be safe as a file name'],
		});
	});

	it('refuses a language that is not an ISO 639-3 code', () => {
		expect(issuesOf(baseCase({ language: 'en' }))).toEqual([
			'language: language must be an ISO 639-3 code, e.g. "eng"',
		]);
	});
});

describe('routing case selection', () => {
	it('applies filter, exclude, and exclude-prefix to the id', () => {
		expect(isRoutingCaseSelected('route-v2-agent-a', { excludePrefix: 'route-v2-' })).toBe(false);
		expect(isRoutingCaseSelected('route-agent-v2-a', { excludePrefix: 'route-v2-' })).toBe(true);
		expect(isRoutingCaseSelected('route-agent-a', { filter: 'agent,debug' })).toBe(true);
		expect(isRoutingCaseSelected('route-answer-a', { filter: 'agent,debug' })).toBe(false);
		expect(isRoutingCaseSelected('route-agent-a', { exclude: 'agent-a' })).toBe(false);
	});

	it('loads only the selected files from a directory', () => {
		const dir = mkdtempSync(join(tmpdir(), 'routing-loader-'));
		for (const id of ['route-debug-one', 'route-v2-debug-two']) {
			writeFileSync(join(dir, `${id}.json`), JSON.stringify(baseCase({ id })));
		}
		writeFileSync(join(dir, 'results.json'), '{}');

		expect(loadRoutingCases(dir).map((c) => c.routingCase.id)).toEqual([
			'route-debug-one',
			'route-v2-debug-two',
		]);
		expect(
			loadRoutingCases(dir, { excludePrefix: 'route-v2-' }).map((c) => c.routingCase.id),
		).toEqual(['route-debug-one']);
		expect(loadRoutingCases(dir, 'two').map((c) => c.routingCase.id)).toEqual([
			'route-v2-debug-two',
		]);
	});

	it('selects only the exact match when the filter is a full id', () => {
		const dir = mkdtempSync(join(tmpdir(), 'routing-loader-'));
		for (const id of ['route-debug-one', 'route-debug-one-more']) {
			writeFileSync(join(dir, `${id}.json`), JSON.stringify(baseCase({ id })));
		}

		expect(loadRoutingCases(dir, 'route-debug-one').map((c) => c.routingCase.id)).toEqual([
			'route-debug-one',
		]);
		expect(loadRoutingCases(dir, 'debug-one')).toHaveLength(2);
		expect(loadRoutingCases(dir, 'route-debug-one,more')).toHaveLength(2);
	});
});
