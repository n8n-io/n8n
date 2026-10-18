import { UserError } from '@n8n/errors';

import { gitHubFolderUrl, parseGitHubLink } from '../github-link';

describe('parseGitHubLink', () => {
	it('reads a repository link', () => {
		expect(parseGitHubLink('https://github.com/acme/skills')).toEqual({
			owner: 'acme',
			repo: 'skills',
			path: '',
		});
	});

	it('reads a folder link with its ref', () => {
		expect(parseGitHubLink('https://github.com/acme/skills/tree/main/skills/pdf/')).toEqual({
			owner: 'acme',
			repo: 'skills',
			ref: 'main',
			path: 'skills/pdf',
		});
	});

	it('reads a SKILL.md link as its folder', () => {
		expect(parseGitHubLink('https://github.com/acme/skills/blob/v1.0.0/pdf/SKILL.md')).toEqual({
			owner: 'acme',
			repo: 'skills',
			ref: 'v1.0.0',
			path: 'pdf',
		});
	});

	it('drops a .git suffix', () => {
		expect(parseGitHubLink('https://github.com/acme/skills.git').repo).toBe('skills');
	});

	it.each([
		'https://gitlab.com/acme/skills',
		'http://github.com/acme/skills',
		'not a link',
		'https://github.com/acme',
		'https://github.com/acme/skills/blob/main/README.md',
		'https://github.com/acme/skills/pulls',
	])('refuses %s', (link) => {
		expect(() => parseGitHubLink(link)).toThrow(UserError);
	});
});

describe('gitHubFolderUrl', () => {
	it('encodes each segment', () => {
		expect(gitHubFolderUrl('acme', 'skills', 'main', 'skills/my skill')).toBe(
			'https://github.com/acme/skills/tree/main/skills/my%20skill',
		);
		expect(gitHubFolderUrl('acme', 'skills', 'main', '')).toBe(
			'https://github.com/acme/skills/tree/main',
		);
	});
});
