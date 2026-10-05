import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadRoutingCases } from '../cases';

function routingCase(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		bucket: 'debug',
		userMessage: 'It failed again.',
		accepts: ['debug', 'clarify'],
		source: 'synthetic',
		...overrides,
	};
}

function caseDir(files: Record<string, unknown>): string {
	const dir = mkdtempSync(join(tmpdir(), 'routing-cases-'));
	for (const [name, body] of Object.entries(files)) {
		writeFileSync(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
	}
	return dir;
}

describe('loadRoutingCases', () => {
	it('loads the route-*.json files in name order and skips other files', () => {
		const dir = caseDir({
			'route-debug-two.json': routingCase('route-debug-two'),
			'route-debug-one.json': routingCase('route-debug-one', { language: 'deu' }),
			'route-prod-debug-three.json': routingCase('route-prod-debug-three'),
			'results.json': '{}',
			'route-notes.md': 'not a case',
		});

		const cases = loadRoutingCases(dir);

		expect(cases.map((c) => c.id)).toEqual([
			'route-debug-one',
			'route-debug-two',
			'route-prod-debug-three',
		]);
		expect(cases[0].language).toBe('deu');
	});

	it('keeps the files whose name contains one of the filter tokens', () => {
		const dir = caseDir({
			'route-agent-one.json': routingCase('route-agent-one', { bucket: 'agent' }),
			'route-debug-one.json': routingCase('route-debug-one'),
			'route-answer-one.json': routingCase('route-answer-one', { bucket: 'answer' }),
		});

		expect(loadRoutingCases(dir, 'AGENT, debug').map((c) => c.id)).toEqual([
			'route-agent-one',
			'route-debug-one',
		]);
	});

	it('reports every invalid file in one error', () => {
		const dir = caseDir({
			'route-debug-ok.json': routingCase('route-debug-ok'),
			'route-debug-renamed.json': routingCase('route-debug-other'),
			'route-debug-token.json': routingCase('route-debug-token', { accepts: ['clarify:workflow'] }),
			'route-debug-extra.json': routingCase('route-debug-extra', { expectedToolInvocations: {} }),
			'route-debug-broken.json': '{',
		});

		expect(() => loadRoutingCases(dir)).toThrow(
			expect.objectContaining({
				message: expect.stringMatching(
					/route-debug-broken\.json[\s\S]*route-debug-extra\.json: \(root\)[\s\S]*route-debug-renamed\.json: id "route-debug-other" must match[\s\S]*route-debug-token\.json: accepts\.0/,
				),
			}),
		);
	});
});
