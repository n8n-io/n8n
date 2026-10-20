import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';

import { readPackageJsonCredentials } from './file-utils.js';

let fixtureDir: string;
let packageJsonPath: string;

beforeEach(() => {
	fixtureDir = mkdtempSync(join(tmpdir(), 'credential-reader-'));
	packageJsonPath = join(fixtureDir, 'package.json');
	writeFileSync(
		packageJsonPath,
		JSON.stringify({
			n8n: {
				credentials: ['Valid.credentials.js', 'Invalid.credentials.js', 'Missing.credentials.js'],
			},
		}),
	);
	writeFileSync(
		join(fixtureDir, 'Valid.credentials.ts'),
		"export class Valid implements ICredentialType { name = 'validApi'; }",
	);
	writeFileSync(join(fixtureDir, 'Invalid.credentials.ts'), 'export class Invalid {');
});

afterEach(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
});

it('keeps available names for lint callers when other credential sources cannot be read', () => {
	expect(readPackageJsonCredentials(packageJsonPath)).toEqual(new Set(['validApi']));
});

it('rejects incomplete metadata for strict callers', () => {
	expect(() => readPackageJsonCredentials(packageJsonPath, { strict: true })).toThrow(
		'Could not read the credential name for Invalid.credentials.js',
	);
});
