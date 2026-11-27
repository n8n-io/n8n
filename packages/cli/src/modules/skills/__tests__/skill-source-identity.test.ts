import {
	skillSourceFolderKeyPrefix,
	skillSourceIdentityKey,
	skillSourcePathsOverlap,
} from '../sources/skill-source-client';

const repository = { type: 'github', host: 'github.com', owner: 'acme', repository: 'skills' };

describe('skill source identity', () => {
	it('keeps the existing identity for repository roots', async () => {
		expect(await skillSourceIdentityKey(repository)).toBe('github:github.com/acme/skills');
		expect(await skillSourceIdentityKey({ ...repository, path: '' })).toBe(
			await skillSourceIdentityKey(repository),
		);
	});

	it('normalizes repository names and preserves folder case', async () => {
		const lower = await skillSourceIdentityKey({ ...repository, path: 'skills/pdf' });
		expect(
			await skillSourceIdentityKey({
				...repository,
				owner: 'ACME',
				repository: 'SKILLS',
				path: 'skills/pdf',
			}),
		).toBe(lower);
		expect(await skillSourceIdentityKey({ ...repository, path: 'skills/PDF' })).not.toBe(lower);
		expect(await skillSourceIdentityKey({ ...repository, path: 'skills/docx' })).not.toBe(lower);
	});

	it('fits long folder identities in the existing column and groups them by repository', async () => {
		const identity = {
			...repository,
			owner: 'a'.repeat(100),
			repository: 'b'.repeat(100),
			path: 'long-folder/'.repeat(100),
		};
		const key = await skillSourceIdentityKey(identity);
		expect(key.length).toBeLessThanOrEqual(255);
		expect(key.startsWith(await skillSourceFolderKeyPrefix(identity))).toBe(true);
		expect(key.startsWith(await skillSourceFolderKeyPrefix(repository))).toBe(false);
	});

	it.each([
		['', '', true],
		['', 'skills/pdf', true],
		['skills/pdf', '', true],
		['skills/pdf', 'skills/pdf', true],
		['skills', 'skills/pdf', true],
		['skills/pdf', 'skills', true],
		['skills/pdf', 'skills/docx', false],
		['skills/pdf', 'skills/pdf-extra', false],
		['skills/pdf', 'skills/PDF', false],
	])('compares folder boundaries: %s and %s overlap: %s', (first, second, expected) => {
		expect(skillSourcePathsOverlap(first, second)).toBe(expected);
	});
});
