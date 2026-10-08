import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadRoutingCases } from '../cases';

// List files in reverse name order, so the tests fail if the loader stops sorting.
vi.mock('fs', async (importOriginal) => {
	const fs = await importOriginal<typeof import('fs')>();
	return { ...fs, readdirSync: (dir: string) => fs.readdirSync(dir).sort().reverse() };
});

/** A case as LangTracer's `export_suite` writes it. */
function exportedCase(tags: string[] = [], overrides: Record<string, unknown> = {}) {
	return {
		complexity: 'simple',
		tags: ['routing', 'bucket:debug', 'accepts:debug', 'accepts:clarify', 'lang:eng', ...tags],
		executionScenarios: [],
		conversation: [{ role: 'user', text: 'It failed again.' }],
		description: 'A failed run with no other context.',
		processExpectations: ['Routes to one of: debug, clarify'],
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
	it('loads the route-*.json files in name order, drops export-only keys, and reads the tags with the bucket accepted', () => {
		const dir = caseDir({
			'route-debug-two.json': exportedCase([], { id: 42, name: 'Two', suiteId: 64 }),
			'route-clarify-open.json': exportedCase([], {
				tags: ['routing', 'bucket:clarify', 'accepts:clarify:open'],
			}),
			'route-prod-agent-one.json': exportedCase([], {
				tags: ['routing', 'bucket:agent', 'accepts:clarify:agent', 'accepts:answer:agent'],
				conversation: [{ role: 'user', text: ['Answer our support inbox.', 'Use our FAQ.'] }],
			}),
			'results.json': '{}',
			'route-notes.md': 'not a case',
		});

		const { cases, needsSetup } = loadRoutingCases(dir);

		expect(cases).toEqual([
			{
				id: 'route-clarify-open',
				bucket: 'clarify',
				accepts: ['clarify:open'],
				after: [],
				userMessage: 'It failed again.',
			},
			{
				id: 'route-debug-two',
				bucket: 'debug',
				accepts: ['debug', 'clarify'],
				after: ['debug'],
				userMessage: 'It failed again.',
			},
			{
				id: 'route-prod-agent-one',
				bucket: 'agent',
				accepts: ['agent', 'clarify:agent', 'answer:agent'],
				after: ['agent'],
				userMessage: 'Answer our support inbox.\nUse our FAQ.',
			},
		]);
		expect(needsSetup).toEqual([]);
	});

	it('keeps the files whose name contains one of the filter tokens', () => {
		const dir = caseDir({
			'route-agent-one.json': exportedCase(),
			'route-debug-one.json': exportedCase(),
			'route-answer-one.json': exportedCase(),
		});

		expect(loadRoutingCases(dir, 'AGENT, debug').cases.map((c) => c.id)).toEqual([
			'route-agent-one',
			'route-debug-one',
		]);
	});

	it('loads the seed, the open workflow and the accounts of a case', () => {
		const dir = caseDir({
			'route-debug-seeded.json': exportedCase([], {
				seed: {
					mode: 'inline',
					messages: [{ role: 'user', text: 'Build me a daily report.' }],
					workflows: [{ id: 'wf-report', name: 'Daily report', nodes: [], connections: {} }],
					priorRuns: [{ workflow: 'wf-report' }],
				},
				conversation: [
					{ role: 'user', text: 'It failed again.', attach: { workflow: 'wf-report' } },
				],
				credentials: [{ type: 'slackApi' }],
			}),
		});

		const [seeded] = loadRoutingCases(dir).cases;

		expect(seeded.attach).toEqual({ workflow: 'wf-report' });
		expect(seeded.credentials).toEqual([{ type: 'slackApi' }]);
		expect(seeded.seed?.messages).toHaveLength(1);
		expect(seeded.seed?.priorRuns).toEqual([{ workflow: 'wf-report' }]);
		expect(seeded.seed?.workflows).toEqual([
			{ id: 'wf-report', name: 'Daily report', nodes: [], connections: {} },
		]);
	});

	it('reads the stage directions of the second user turn and the after tags', () => {
		const dir = caseDir({
			'route-clarify-directed.json': exportedCase([], {
				tags: ['routing', 'bucket:clarify', 'accepts:clarify:open', 'after:agent'],
				conversation: [
					{ role: 'user', text: 'Help me with leads.' },
					{ role: 'user', text: ['[Leads message us all day.]', '[The user wants replies.]'] },
				],
			}),
		});

		const [directed] = loadRoutingCases(dir).cases;

		expect(directed).toMatchObject({
			userMessage: 'Help me with leads.',
			direction: '[Leads message us all day.]\n[The user wants replies.]',
			after: ['agent'],
		});
	});

	it('returns the cases that need setup the stub instance cannot do, without running them', () => {
		const dir = caseDir({
			'route-debug-ok.json': exportedCase(),
			'route-debug-replay.json': exportedCase([], {
				seed: { mode: 'replay', threadId: 'thread-1' },
			}),
			'route-debug-in-folder.json': exportedCase([], {
				seed: { mode: 'inline', folders: [{ id: 'folder-1', name: 'Reports' }] },
			}),
			'route-debug-in-browser.json': exportedCase([], { credentialFixture: 'local' }),
		});

		const { cases, needsSetup } = loadRoutingCases(dir);

		expect(cases.map((c) => c.id)).toEqual(['route-debug-ok']);
		expect(needsSetup).toEqual([
			'route-debug-in-browser',
			'route-debug-in-folder',
			'route-debug-replay',
		]);
	});

	it('reports every invalid file in one error', () => {
		const tags = (...extra: string[]) => ({ tags: ['routing', ...extra] });
		const dir = caseDir({
			'route-debug-ok.json': exportedCase(),
			'route-debug-broken.json': '{',
			'route-debug-assistant-turn.json': exportedCase([], {
				conversation: [{ role: 'assistant', text: 'It failed again.' }],
			}),
			'route-debug-no-routing-tag.json': exportedCase([], {
				tags: ['bucket:debug', 'accepts:debug'],
			}),
			'route-debug-two-buckets.json': exportedCase(
				[],
				tags('bucket:debug', 'bucket:agent', 'accepts:debug'),
			),
			'route-clarify-no-accepts.json': exportedCase([], tags('bucket:clarify')),
			'route-debug-bad-token.json': exportedCase(
				[],
				tags('bucket:debug', 'accepts:clarify:workflow'),
			),
			'route-debug-two-turns.json': exportedCase([], {
				conversation: [
					{ role: 'user', text: 'It failed.' },
					{ role: 'user', text: '[Hourly.] Again.' },
				],
			}),
			'route-clarify-direction-no-after.json': exportedCase([], {
				...tags('bucket:clarify', 'accepts:clarify:open'),
				conversation: [
					{ role: 'user', text: 'Help me with leads.' },
					{ role: 'user', text: '[Leads message us all day.]' },
				],
			}),
		});

		expect(() => loadRoutingCases(dir)).toThrow(
			expect.objectContaining({
				message: expect.stringMatching(
					/route-clarify-direction-no-after\.json: a case with stage directions needs an after:<route> tag[\s\S]*route-clarify-no-accepts\.json: accepts: a bucket:clarify case needs an accepts:<token> tag[\s\S]*route-debug-assistant-turn\.json: needs one user message[\s\S]*route-debug-bad-token\.json: accepts\.0[\s\S]*route-debug-broken\.json[\s\S]*route-debug-no-routing-tag\.json: has no "routing" tag[\s\S]*route-debug-two-buckets\.json: bucket: needs exactly one bucket:<route> tag[\s\S]*route-debug-two-turns\.json: needs one user message, then at most one user turn with only \[stage directions\]/,
				),
			}),
		);
	});
});
