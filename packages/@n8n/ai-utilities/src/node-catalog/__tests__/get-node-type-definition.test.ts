import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getNodeTypeDefinition } from '../get';

describe('getNodeTypeDefinition — split-node discriminator handling', () => {
	let defsDir: string;

	beforeAll(() => {
		defsDir = mkdtempSync(join(tmpdir(), 'ai-utils-node-defs-'));
		const setDir = join(defsDir, 'nodes', 'n8n-nodes-base', 'set', 'v34');
		mkdirSync(setDir, { recursive: true });
		writeFileSync(join(setDir, 'mode_manual.ts'), '// manual mode def');
		writeFileSync(join(setDir, 'mode_raw.ts'), '// raw mode def');

		const msgDir = join(defsDir, 'nodes', 'n8n-nodes-base', 'slack', 'v22', 'resource_message');
		mkdirSync(msgDir, { recursive: true });
		writeFileSync(join(msgDir, 'operation_post.ts'), '// slack post def');
		writeFileSync(join(msgDir, 'operation_update.ts'), '// slack update def');
	});

	afterAll(() => {
		rmSync(defsDir, { recursive: true, force: true });
	});

	it('returns a single definition when the mode discriminator is given', () => {
		const result = getNodeTypeDefinition('n8n-nodes-base.set', undefined, [defsDir], {
			mode: 'manual',
		});

		expect(result.error).toBeUndefined();
		expect(result.content).toBe('// manual mode def');
	});

	it('returns all mode variants instead of an error when the mode is omitted', () => {
		const result = getNodeTypeDefinition('n8n-nodes-base.set', undefined, [defsDir]);

		expect(result.error).toBeUndefined();
		expect(result.content).toContain('definitions for all 2 modes');
		expect(result.content).toContain('// ── mode: manual ──');
		expect(result.content).toContain('// raw mode def');
	});

	it('still errors for an invalid explicit mode', () => {
		const result = getNodeTypeDefinition('n8n-nodes-base.set', undefined, [defsDir], {
			mode: 'nope',
		});

		expect(result.error).toContain("Invalid mode 'nope'");
	});

	it('includes the resource→operations index when resource/operation are omitted', () => {
		const result = getNodeTypeDefinition('n8n-nodes-base.slack', undefined, [defsDir]);

		expect(result.error).toContain('requires resource and operation discriminators');
		expect(result.error).toContain('message (post, update)');
	});
});
