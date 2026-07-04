import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolveNodeTypeDefinition } from '../node-definition-resolver';

describe('resolveNodeTypeDefinition', () => {
	let defsDir: string;

	beforeAll(() => {
		defsDir = mkdtempSync(join(tmpdir(), 'node-defs-'));
		const setDir = join(defsDir, 'nodes', 'n8n-nodes-base', 'set', 'v34');
		mkdirSync(setDir, { recursive: true });
		writeFileSync(join(setDir, 'mode_manual.ts'), '// manual mode def');
		writeFileSync(join(setDir, 'mode_raw.ts'), '// raw mode def');
	});

	afterAll(() => {
		rmSync(defsDir, { recursive: true, force: true });
	});

	it('returns a single definition when the mode discriminator is given', () => {
		const result = resolveNodeTypeDefinition('n8n-nodes-base.set', [defsDir], { mode: 'manual' });

		expect(result.error).toBeUndefined();
		expect(result.content).toBe('// manual mode def');
	});

	it('returns all mode variants instead of an error when the mode is omitted', () => {
		// An error here would force the model into a retry — a full extra LLM
		// round-trip. All mode-split nodes have few, small variants.
		const result = resolveNodeTypeDefinition('n8n-nodes-base.set', [defsDir]);

		expect(result.error).toBeUndefined();
		expect(result.content).toContain('definitions for all 2 modes');
		expect(result.content).toContain('// ── mode: manual ──');
		expect(result.content).toContain('// manual mode def');
		expect(result.content).toContain('// ── mode: raw ──');
		expect(result.content).toContain('// raw mode def');
	});

	it('still errors for an invalid explicit mode', () => {
		const result = resolveNodeTypeDefinition('n8n-nodes-base.set', [defsDir], { mode: 'nope' });

		expect(result.error).toContain("Invalid mode 'nope'");
	});
});
