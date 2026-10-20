import {
	decryptPayload,
	encryptPayload,
	keepIncomingShare,
	parseImportHash,
	SkillShareError,
	takeIncomingShare,
	type SkillSharePayload,
} from './skillShare';

const payload: SkillSharePayload = {
	format: 'n8n-skill-share/1',
	skill: {
		name: 'Invoice triage',
		description: 'Route invoices',
		instructions: 'Read the vendor and the amount.',
		references: [{ path: 'references/vendors.md', content: '- Acme' }],
	},
	source: { author: 'Ricardo', version: 3, sharedAt: '2026-10-20T10:00:00.000Z' },
};

describe('skillShare', () => {
	beforeEach(() => sessionStorage.clear());

	describe('encryptPayload / decryptPayload', () => {
		it('should decrypt what it encrypted', async () => {
			const { ciphertext, key } = await encryptPayload(payload);
			expect(ciphertext).toMatch(/^[A-Za-z0-9_-]+$/);
			expect(ciphertext).not.toContain('Invoice');
			await expect(decryptPayload(ciphertext, key)).resolves.toEqual(payload);
		});

		it('should refuse a wrong key', async () => {
			const { ciphertext } = await encryptPayload(payload);
			const { key: otherKey } = await encryptPayload(payload);
			await expect(decryptPayload(ciphertext, otherKey)).rejects.toEqual(
				new SkillShareError('bad_key'),
			);
		});
	});

	describe('parseImportHash', () => {
		it('should read the id and the key', () => {
			expect(parseImportHash('#share=abc&k=xyz')).toEqual({ id: 'abc', key: 'xyz' });
		});

		it('should ignore a fragment without a key', () => {
			expect(parseImportHash('#share=abc')).toBeNull();
			expect(parseImportHash('')).toBeNull();
		});
	});

	describe('keepIncomingShare / takeIncomingShare', () => {
		it('should keep a share across a sign-in and read it once', () => {
			keepIncomingShare({ pathname: '/settings/context/skills', hash: '#share=abc&k=xyz' });
			expect(takeIncomingShare('')).toEqual({ id: 'abc', key: 'xyz' });
			expect(takeIncomingShare('')).toBeNull();
		});

		it('should keep nothing on other pages', () => {
			keepIncomingShare({ pathname: '/workflows', hash: '#share=abc&k=xyz' });
			expect(takeIncomingShare('')).toBeNull();
		});

		it('should prefer the fragment and drop the kept share', () => {
			keepIncomingShare({ pathname: '/settings/context/skills', hash: '#share=old&k=1' });
			expect(takeIncomingShare('#share=new&k=2')).toEqual({ id: 'new', key: '2' });
			expect(takeIncomingShare('')).toBeNull();
		});
	});
});
