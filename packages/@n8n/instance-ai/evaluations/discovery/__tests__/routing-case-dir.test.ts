import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { routingExpectationText } from '../../routing/expectation';
import { toLangTracerCreateBody } from '../../routing/langtracer-cases';
import { parseRoutingCase, type RoutingCase } from '../../routing/loader';
import { isRoutingExportBody, loadRoutingCaseDir } from '../routing-case-dir';

function routingCase(raw: Record<string, unknown> = {}): RoutingCase {
	const parsed = parseRoutingCase({
		id: 'route-agent-support',
		bucket: 'agent',
		userMessage: 'Set up AI support in our group.',
		accepts: ['agent', 'clarify:agent'],
		source: 'synthetic',
		rationale: 'Ongoing conversational support role.',
		...raw,
	});
	if (!parsed.success) throw new Error(parsed.issues.join('; '));
	return parsed.data;
}

/** The body LangTracer exports (and the dispatcher writes) for a pushed routing case. */
function exportBody(source: RoutingCase): Record<string, unknown> {
	const body = toLangTracerCreateBody(source, { suiteId: 64, setKind: 'regression' });
	return {
		complexity: body.evalComplexity,
		tags: body.evalTags,
		conversation: body.conversation,
		description: body.description,
		processExpectations: [routingExpectationText(source.accepts)],
	};
}

function caseDir(files: Record<string, unknown>): string {
	const dir = mkdtempSync(join(tmpdir(), 'routing-case-dir-'));
	for (const [name, body] of Object.entries(files)) {
		writeFileSync(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
	}
	return dir;
}

describe('loadRoutingCaseDir', () => {
	it('reads authored case files and export bodies side by side', () => {
		const dir = caseDir({
			'route-debug-failed-run.json': routingCase({
				id: 'route-debug-failed-run',
				bucket: 'debug',
				accepts: ['debug', 'clarify'],
			}),
			'route-agent-support.json': exportBody(routingCase()),
			'results.json': { cases: [] },
			'notes.json': 'not json',
		});

		const loaded = loadRoutingCaseDir(dir);

		expect(loaded.map((c) => [c.routingCase.id, c.fileName])).toEqual([
			['route-agent-support', 'route-agent-support'],
			['route-debug-failed-run', 'route-debug-failed-run'],
		]);
		expect(loaded[0].routingCase).toMatchObject({
			bucket: 'agent',
			accepts: ['agent', 'clarify:agent'],
			rationale: 'Ongoing conversational support role.',
		});
		expect(loaded[0].scenario.userMessage).toBe('Set up AI support in our group.');
	});

	it('uses the file name as the id of an export body without a name', () => {
		const dir = caseDir({ 'lt-route-agent-support-1a2b3c4d.json': exportBody(routingCase()) });

		const [loaded] = loadRoutingCaseDir(dir, { filter: 'lt-route-agent-support-1a2b3c4d' });

		expect(loaded.routingCase.id).toBe('lt-route-agent-support-1a2b3c4d');
		expect(loaded.scenario.id).toBe('lt-route-agent-support-1a2b3c4d');
	});

	it('uses the name of an export body when it carries one', () => {
		const dir = caseDir({
			'lt-case.json': { ...exportBody(routingCase()), name: 'route-agent-support' },
		});

		expect(loadRoutingCaseDir(dir, { filter: 'route-agent-support' })).toMatchObject([
			{ routingCase: { id: 'route-agent-support' }, fileName: 'lt-case' },
		]);
	});

	it('selects only the exact match when the filter names one case', () => {
		const dir = caseDir({
			'route-agent-support.json': exportBody(routingCase()),
			'route-agent-support-2.json': exportBody(routingCase()),
		});

		expect(loadRoutingCaseDir(dir, { filter: 'route-agent-support' })).toHaveLength(1);
		expect(loadRoutingCaseDir(dir, { filter: 'agent-support' })).toHaveLength(2);
	});

	it('reports every invalid case file in one error', () => {
		const dir = caseDir({
			'route-agent-bad.json': routingCase({ id: 'route-agent-other' }),
			'lt-broken.json': { tags: ['routing', 'accepts:agent'], conversation: [] },
		});

		expect(() => loadRoutingCaseDir(dir)).toThrow(
			/lt-broken\.json: no "bucket:" tag[\s\S]*route-agent-bad\.json: id "route-agent-other" must match the file name/,
		);
	});
});

describe('isRoutingExportBody', () => {
	it('needs a routing tag', () => {
		expect(isRoutingExportBody({ tags: ['routing'] })).toBe(true);
		expect(isRoutingExportBody({ tags: ['agents'] })).toBe(false);
		expect(isRoutingExportBody(routingCase())).toBe(false);
	});
});
