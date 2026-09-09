import { execFileSync } from 'node:child_process';

import { buildHttpsGitConfig } from '../promotions-git.utils';

describe('Promotion Git credentials', () => {
	it.each([
		{ username: 'git-user', password: 'git-password' },
		{ username: 'user\'"$name', password: 'pass\'"$(printf expanded)`printf expanded`\\end' },
	])('passes literal credential values to Git (%#)', ({ username, password }) => {
		const config = buildHttpsGitConfig({ repositoryUrl: 'https://example.com/repo.git' });
		const args = [
			'-c',
			'credential.helper=',
			...config.flatMap((entry) => ['-c', entry]),
			'credential',
			'fill',
		];

		const result = execFileSync('git', args, {
			encoding: 'utf8',
			input: 'protocol=https\nhost=example.com\npath=repo.git\n\n',
			env: {
				...process.env,
				GIT_TERMINAL_PROMPT: '0',
				N8N_GIT_USERNAME: username,
				N8N_GIT_PASSWORD: password,
			},
		});

		expect(result).toContain(`username=${username}\n`);
		expect(result).toContain(`password=${password}\n`);
		expect(args.join(' ')).not.toContain(username);
		expect(args.join(' ')).not.toContain(password);
	});
});
