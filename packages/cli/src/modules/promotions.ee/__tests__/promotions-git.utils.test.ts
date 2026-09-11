import {
	buildHttpsGitConfig,
	buildSshCommand,
	checkoutBranchName,
	generateSshKeyPair,
} from '../promotions-git.utils';

describe('promotions-git.utils', () => {
	describe('buildHttpsGitConfig', () => {
		const originalEnv = process.env;

		beforeEach(() => {
			process.env = { ...originalEnv };
			for (const key of [
				'HTTP_PROXY',
				'HTTPS_PROXY',
				'http_proxy',
				'https_proxy',
				'NO_PROXY',
				'no_proxy',
				'ALL_PROXY',
				'all_proxy',
				'GIT_SSL_CAINFO',
				'GIT_SSL_CAPATH',
			]) {
				delete process.env[key];
			}
		});

		afterEach(() => {
			process.env = originalEnv;
		});

		it('builds a credential helper that reads the operation environment', () => {
			const config = buildHttpsGitConfig({ repositoryUrl: 'https://github.com/user/repo.git' });

			expect(config).toEqual([
				'credential.helper=!f() { printf \'%s\\n\' "username=$N8N_GIT_USERNAME" "password=$N8N_GIT_PASSWORD"; }; f',
				'credential.useHttpPath=true',
				'http.lowSpeedLimit=1000',
				'http.lowSpeedTime=30',
			]);
		});

		it('adds http.proxy when a proxy resolves for the repository URL', () => {
			process.env.HTTPS_PROXY = 'http://proxy.company.com:8080';

			const config = buildHttpsGitConfig({ repositoryUrl: 'https://github.com/user/repo.git' });

			expect(config).toContain('http.proxy=http://proxy.company.com:8080');
		});

		it('adds no proxy setting when no proxy is configured', () => {
			const config = buildHttpsGitConfig({ repositoryUrl: 'https://github.com/user/repo.git' });

			expect(config.some((entry) => entry.includes('proxy='))).toBe(false);
		});

		it('carries the CA settings from the environment over as config', () => {
			process.env.GIT_SSL_CAINFO = '/certs/bundle.crt';
			process.env.GIT_SSL_CAPATH = '/certs';

			const config = buildHttpsGitConfig({ repositoryUrl: 'https://github.com/user/repo.git' });

			expect(config).toContain('http.sslCAInfo=/certs/bundle.crt');
			expect(config).toContain('http.sslCAPath=/certs');
		});
	});

	describe('buildSshCommand', () => {
		it('builds an ssh command pinning host keys with accept-new', () => {
			const command = buildSshCommand({
				privateKeyPath: '/data/.ssh/private-key',
				knownHostsPath: '/data/.ssh/known_hosts',
			});

			expect(command).toBe(
				"ssh -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o UserKnownHostsFile='/data/.ssh/known_hosts' -o StrictHostKeyChecking=accept-new -i '/data/.ssh/private-key'",
			);
		});

		it('normalizes Windows-style backslash paths to POSIX', () => {
			const command = buildSshCommand({
				privateKeyPath: 'C:\\n8n\\.ssh\\private-key',
				knownHostsPath: 'C:\\n8n\\.ssh\\known_hosts',
			});

			expect(command).toBe(
				"ssh -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o UserKnownHostsFile='C:/n8n/.ssh/known_hosts' -o StrictHostKeyChecking=accept-new -i 'C:/n8n/.ssh/private-key'",
			);
		});

		it('quotes shell metacharacters in paths', () => {
			const command = buildSshCommand({
				privateKeyPath: "/data/$(archive)/owner's/private-key",
				knownHostsPath: '/data/`archive`/known_hosts',
			});

			expect(command).toContain("-i '/data/$(archive)/owner'\"'\"'s/private-key'");
			expect(command).toContain("-o UserKnownHostsFile='/data/`archive`/known_hosts'");
		});
	});

	describe('generateSshKeyPair', () => {
		it('generates a parseable ed25519 key pair carrying the comment', async () => {
			const keyPair = await generateSshKeyPair('ed25519', 'n8n promotions');

			expect(keyPair.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
			expect(keyPair.publicKey).toContain('ssh-ed25519');
			expect(keyPair.publicKey).toContain('n8n promotions');
		});

		it('generates a parseable rsa key pair', async () => {
			const keyPair = await generateSshKeyPair('rsa', 'n8n promotions');

			expect(keyPair.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
			expect(keyPair.publicKey).toContain('ssh-rsa');
		});
	});

	describe('checkoutBranchName', () => {
		it('reads the branch an Apply config imports from', () => {
			const branch = checkoutBranchName({
				direction: 'apply',
				settings: { schemaVersion: 1, branchName: 'dev' },
			});

			expect(branch).toBe('dev');
		});

		it('reads the base branch a Promote config starts from', () => {
			const branch = checkoutBranchName({
				direction: 'promote',
				settings: {
					schemaVersion: 1,
					baseBranchName: 'staging',
					// The branch a promotion creates is never the checkout branch.
					createBranchOnPromotion: true,
				},
			});

			expect(branch).toBe('staging');
		});
	});
});
