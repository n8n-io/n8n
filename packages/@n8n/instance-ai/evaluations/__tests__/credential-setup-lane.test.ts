// The resolver IS the pay-per-use guarantee: `kind: 'none'` means nothing boots.
// These tests are the guard that an ordinary case can never start a browser or
// open a port — and that a case which ASKS for the lane but names nothing
// resolvable fails loudly instead of silently running without a browser.

import { jsonParse } from 'n8n-workflow';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

import { resolveCredentialSetupFixture } from '../harness/credential-setup-lane';

const CASE_DIR = join(__dirname, '..', 'data', 'workflows');

describe('resolveCredentialSetupFixture', () => {
	it('resolves a shipped fixture from credentialFixture', async () => {
		const sel = await resolveCredentialSetupFixture({ credentialFixture: 'anthropic' });
		expect(sel.kind).toBe('fixture');
		if (sel.kind === 'fixture') expect(sel.fixture.id).toBe('anthropic');
	});

	it('resolves the reserved `local` id to real-site mode', async () => {
		expect(await resolveCredentialSetupFixture({ credentialFixture: 'local' })).toEqual({
			kind: 'local',
		});
	});

	it('boots nothing for an ordinary case', async () => {
		expect((await resolveCredentialSetupFixture({})).kind).toBe('none');
		expect((await resolveCredentialSetupFixture({ credentialFixture: undefined })).kind).toBe(
			'none',
		);
	});

	it('THROWS on an unknown fixture id, listing what is available', async () => {
		// Previously this returned undefined and the case ran with no browser,
		// failing as if the agent had misbehaved.
		await expect(resolveCredentialSetupFixture({ credentialFixture: 'stripe' })).rejects.toThrow(
			/Unknown credentialFixture "stripe"/,
		);
	});

	it('resolves the reserved local id without touching a fixture', async () => {
		expect(await resolveCredentialSetupFixture({ credentialFixture: 'local' })).toEqual({
			kind: 'local',
		});
	});

	it('opts in exactly the cases that declare a credentialFixture, and no others', async () => {
		const files = readdirSync(CASE_DIR).filter((f) => f.endsWith('.json'));
		expect(files.length).toBeGreaterThan(1);

		const opted: string[] = [];
		for (const file of files) {
			const testCase = jsonParse<{ credentialFixture?: string }>(
				readFileSync(join(CASE_DIR, file), 'utf8'),
			);
			const sel = await resolveCredentialSetupFixture(testCase);
			if (sel.kind !== 'none') opted.push(file);
		}
		expect(opted).toEqual(['credential-setup-anthropic-browser.json']);
	});
});
