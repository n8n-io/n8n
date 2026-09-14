import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getNodeTypeDefinition, versionDirToNumber } from '../get';

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

describe('versionDirToNumber', () => {
	it('reads a two-digit suffix as major.minor, not a plain integer', () => {
		// The bug: v22 (2.2) must rank below v3 (3), not above it.
		expect(versionDirToNumber('v3')).toBeGreaterThan(versionDirToNumber('v22'));
		expect(versionDirToNumber('v22')).toBe(2.2);
		expect(versionDirToNumber('v21')).toBe(2.1);
		expect(versionDirToNumber('v3')).toBe(3);
		expect(versionDirToNumber('v1')).toBe(1);
	});

	it('leaves the known two-digit-major limitation documented', () => {
		// v10 is ambiguous under the dot-dropping encoding and reads as 1.0;
		// no node is near a two-digit major, so this is an accepted limitation.
		expect(versionDirToNumber('v10')).toBe(1);
	});
});

describe('getNodeTypeDefinition — latest version resolution', () => {
	let defsDir: string;

	beforeAll(() => {
		defsDir = mkdtempSync(join(tmpdir(), 'ai-utils-node-defs-versions-'));
		// Notion is a split (resource/operation) node shipping versions
		// 1, 2, 2.1, 2.2 and 3, so on disk its version dirs are
		// v1, v2, v21, v22, v3 (the dot is dropped when naming).
		const notionDir = join(defsDir, 'nodes', 'n8n-nodes-base', 'notion');
		for (const [version, content] of [
			['v1', '// notion v1 get def'],
			['v2', '// notion v2 get def'],
			['v21', '// notion v2.1 get def'],
			['v22', '// notion v2.2 get def'],
			['v3', '// notion v3 get def'],
		]) {
			const opDir = join(notionDir, version, 'resource_database_page');
			mkdirSync(opDir, { recursive: true });
			writeFileSync(join(opDir, 'operation_get.ts'), content);
		}
	});

	afterAll(() => {
		rmSync(defsDir, { recursive: true, force: true });
	});

	it('treats v3 as latest, not v2.2, when no version is requested', () => {
		const result = getNodeTypeDefinition('n8n-nodes-base.notion', undefined, [defsDir], {
			resource: 'databasePage',
			operation: 'get',
		});

		expect(result.error).toBeUndefined();
		expect(result.version).toBe('v3');
		expect(result.content).toBe('// notion v3 get def');
	});
});
