import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

import { startSelfSignedGitServer, TLS_VERIFICATION_ERROR } from '@test/self-signed-git-server';

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

describe('Promotion Git TLS trust', () => {
	const originalEnv = process.env;
	let server: Awaited<ReturnType<typeof startSelfSignedGitServer>>;

	beforeAll(async () => {
		server = await startSelfSignedGitServer();
	});

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.GIT_SSL_CAINFO;
	});

	afterAll(async () => {
		process.env = originalEnv;
		await server.close();
	});

	// Runs Git the way simple-git does: with a replaced environment, so only the config reaches it.
	// Async, because the server that Git talks to lives on this event loop.
	const listRemote = async () => {
		const config = buildHttpsGitConfig({ repositoryUrl: server.repositoryUrl });
		await promisify(execFile)(
			'git',
			[...config.flatMap((entry) => ['-c', entry]), 'ls-remote', server.repositoryUrl],
			{ env: { GIT_TERMINAL_PROMPT: '0' } },
		);
	};

	it('rejects a self-signed certificate without GIT_SSL_CAINFO', async () => {
		await expect(listRemote()).rejects.toThrow(TLS_VERIFICATION_ERROR);
	});

	it('trusts the certificate when GIT_SSL_CAINFO names it', async () => {
		process.env.GIT_SSL_CAINFO = server.certPath;

		await expect(listRemote()).resolves.toBeUndefined();
	});
});
