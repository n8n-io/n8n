import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';

import { loadEvalCasesFromDir } from '../utils/load-eval-cases';

const validCase = {
	conversation: [{ role: 'user', text: 'Build a webhook that posts to Slack' }],
	complexity: 'simple',
	tags: [],
	processExpectations: ['the agent builds a webhook workflow'],
};

// A sibling with a key the schema does not know yet (a case authored on a newer
// branch) used to fail every push from master.
describe('loadEvalCasesFromDir', () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'eval-cases-'));
		writeFileSync(join(dir, 'good-case.json'), JSON.stringify(validCase));
		writeFileSync(
			join(dir, 'newer-schema-case.json'),
			JSON.stringify({ ...validCase, requiresMemoryCompaction: true }),
		);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it('parses only the selected slugs, so an invalid sibling never blocks them', () => {
		const loaded = loadEvalCasesFromDir(dir, undefined, undefined, undefined, {
			slugs: new Set(['good-case']),
		});

		expect(loaded.map((c) => c.fileSlug)).toEqual(['good-case']);
	});

	it('reports and skips an invalid file when asked to, instead of throwing', () => {
		const onInvalid = vi.fn();

		const loaded = loadEvalCasesFromDir(dir, undefined, undefined, undefined, { onInvalid });

		expect(loaded.map((c) => c.fileSlug)).toEqual(['good-case']);
		expect(onInvalid).toHaveBeenCalledTimes(1);
		expect(onInvalid.mock.calls[0][0]).toContain('newer-schema-case.json');
		expect(onInvalid.mock.calls[0][1].message).toContain('requiresMemoryCompaction');
	});

	it('still throws on an invalid file by default, so the runner never grades a partial corpus', () => {
		expect(() => loadEvalCasesFromDir(dir)).toThrow(/newer-schema-case\.json/);
	});
});
