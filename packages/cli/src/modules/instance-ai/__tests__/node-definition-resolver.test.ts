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

describe('resolveNodeTypeDefinition — resource/operation split', () => {
	let defsDir: string;

	beforeAll(() => {
		defsDir = mkdtempSync(join(tmpdir(), 'node-defs-ro-'));
		const msgDir = join(defsDir, 'nodes', 'n8n-nodes-base', 'slack', 'v22', 'resource_message');
		mkdirSync(msgDir, { recursive: true });
		writeFileSync(join(msgDir, 'operation_post.ts'), '// slack post def');
		writeFileSync(join(msgDir, 'operation_update.ts'), '// slack update def');
	});

	afterAll(() => {
		rmSync(defsDir, { recursive: true, force: true });
	});

	it('errors with the full resource→operations index when discriminators are omitted', () => {
		const result = resolveNodeTypeDefinition('n8n-nodes-base.slack', [defsDir]);

		expect(result.error).toContain('requires resource and operation discriminators');
		expect(result.error).toContain('message (post, update)');
	});

	it('returns the definition when both discriminators are given', () => {
		const result = resolveNodeTypeDefinition('n8n-nodes-base.slack', [defsDir], {
			resource: 'message',
			operation: 'post',
		});

		expect(result.error).toBeUndefined();
		expect(result.content).toBe('// slack post def');
	});
});
