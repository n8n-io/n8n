import { describe, it, expect } from 'vitest';

import { formatOutput } from '../output';

/** Longer than the 60-character cutoff, like a real SSH public key. */
const LONG = `ssh-ed25519 ${'A'.repeat(100)} n8n-promotions`;

describe('table output', () => {
	it('shows a long value in full in the key-value view', () => {
		// A public key is only useful if you can copy it.
		expect(formatOutput({ publicKey: LONG }, { format: 'table' })).toContain(LONG);
		expect(formatOutput({ publicKey: LONG }, { format: 'table', noHeader: true })).toBe(LONG);
	});

	it('reads a dotted column from a nested field and names it after the last segment', () => {
		const rows = [{ id: 'conn-1', target: { schemaVersion: 1, remoteUrl: 'git@host:acme/a.git' } }];

		const lines = formatOutput(rows, {
			format: 'table',
			columns: ['id', 'target.remoteUrl'],
		}).split('\n');

		expect(lines[0]).toContain('REMOTEURL');
		expect(lines[0]).not.toContain('TARGET');
		expect(lines[2]).toContain('git@host:acme/a.git');
		// The nested wrapper never reaches the table.
		expect(lines[2]).not.toContain('schemaVersion');
	});

	it('keeps the full path when two columns end in the same name', () => {
		const rows = [{ id: 'x', apply: { branchName: 'main' }, promote: { branchName: 'release' } }];

		const lines = formatOutput(rows, {
			format: 'table',
			columns: ['id', 'apply.branchName', 'promote.branchName'],
		}).split('\n');

		// Two `BRANCHNAME` headers would not say which column is which.
		expect(lines[0]).toContain('APPLY.BRANCHNAME');
		expect(lines[0]).toContain('PROMOTE.BRANCHNAME');
		expect(lines[2]).toContain('main');
		expect(lines[2]).toContain('release');
	});

	it('shortens a long value in a multi-row table so the columns stay aligned', () => {
		const rows = [
			{ id: 'a', name: LONG },
			{ id: 'b', name: 'short' },
		];

		const lines = formatOutput(rows, { format: 'table' }).split('\n');

		expect(lines.join('\n')).not.toContain(LONG);
		// Header, separator, and both rows keep one width.
		expect(new Set(lines.map((line) => line.length)).size).toBe(1);
	});
});
