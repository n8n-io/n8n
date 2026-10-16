import { mockLogger } from '@n8n/backend-test-utils';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { startSelfSignedGitServer, TLS_VERIFICATION_ERROR } from '@test/self-signed-git-server';

import { PromotionsGitService } from '../promotions-git.service';
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

describe('Promotion Git checkout', () => {
	let tmpRoot: string;

	beforeEach(async () => {
		tmpRoot = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-checkout-'));
	});

	afterEach(async () => {
		await rm(tmpRoot, { recursive: true, force: true });
	});

	it.each([
		{ authType: 'token', username: 'git-user', password: 'git-password' },
		{ authType: 'ssh-key', privateKey: 'unused-private-key' },
	] as const)('bootstraps a checkout from an empty remote ($authType)', async (credentials) => {
		const remotePath = path.join(tmpRoot, 'remote.git');
		execFileSync('git', ['init', '--bare', '--quiet', remotePath]);
		const remoteUrl = pathToFileURL(remotePath).href;
		const rootFolder = path.join(tmpRoot, 'checkout');
		const paths = {
			rootFolder,
			repositoryFolder: path.join(rootFolder, 'repository'),
			nextRepositoryFolder: path.join(rootFolder, 'repository-next'),
			sshDir: path.join(rootFolder, 'ssh'),
		};

		await new PromotionsGitService(mockLogger()).clone({
			remoteUrl,
			credentials,
			paths,
			branchName: 'main',
			configId: 'config-1',
		});

		const git = (...args: string[]) =>
			execFileSync('git', ['-C', paths.repositoryFolder, ...args], { encoding: 'utf8' }).trim();
		expect(git('remote', 'get-url', 'origin')).toBe(remoteUrl);
		expect(git('symbolic-ref', '--short', 'HEAD')).toBe('main');
	});
});
