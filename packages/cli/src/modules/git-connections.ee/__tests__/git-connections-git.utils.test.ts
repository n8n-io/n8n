import {
	buildHttpsGitConfig,
	buildPromotionBranchName,
	buildSshCommand,
	generateSshKeyPair,
} from '../git-connections-git.utils';

describe('git-connections-git.utils', () => {
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
			]) {
				delete process.env[key];
			}
		});

		afterEach(() => {
			process.env = originalEnv;
		});

		it('should build a path-scoped credential helper for plain credentials', () => {
			const config = buildHttpsGitConfig('https://github.com/user/repo.git', {
				username: 'testuser',
				password: 'testpass',
			});

			expect(config).toEqual([
				"credential.helper=!f() { echo username='testuser'; echo password='testpass'; }; f",
				'credential.useHttpPath=true',
				'http.lowSpeedLimit=1000',
				'http.lowSpeedTime=30',
			]);
		});

		it('should escape single quotes so credentials cannot break out of the helper', () => {
			const config = buildHttpsGitConfig('https://github.com/user/repo.git', {
				username: "user'; rm -rf /",
				password: "pass'; rm -rf /",
			});

			expect(config[0]).toBe(
				"credential.helper=!f() { echo username='user'\"'\"'; rm -rf /'; echo password='pass'\"'\"'; rm -rf /'; }; f",
			);
		});

		it('should append http.proxy when a proxy resolves for the repository URL', () => {
			process.env.HTTPS_PROXY = 'http://proxy.company.com:8080';

			const config = buildHttpsGitConfig('https://github.com/user/repo.git', {
				username: 'testuser',
				password: 'testpass',
			});

			expect(config).toContain('http.proxy=http://proxy.company.com:8080');
		});

		it('should not append http.proxy when no proxy is set', () => {
			const config = buildHttpsGitConfig('https://github.com/user/repo.git', {
				username: 'testuser',
				password: 'testpass',
			});

			expect(config.some((entry) => entry.includes('proxy='))).toBe(false);
		});

		it('should bound stalled transfers with a low-speed limit', () => {
			const config = buildHttpsGitConfig('https://github.com/user/repo.git', {
				username: 'testuser',
				password: 'testpass',
			});

			expect(config).toContain('http.lowSpeedLimit=1000');
			expect(config).toContain('http.lowSpeedTime=30');
		});
	});

	describe('buildSshCommand', () => {
		it('should build an ssh command pinning host keys with accept-new', () => {
			const command = buildSshCommand({
				privateKeyPath: '/data/.ssh/private-key',
				knownHostsPath: '/data/.ssh/known_hosts',
			});

			expect(command).toBe(
				"ssh -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o UserKnownHostsFile='/data/.ssh/known_hosts' -o StrictHostKeyChecking=accept-new -i '/data/.ssh/private-key'",
			);
		});

		it('should normalize Windows-style backslash paths to POSIX', () => {
			const command = buildSshCommand({
				privateKeyPath: 'C:\\n8n\\.ssh\\private-key',
				knownHostsPath: 'C:\\n8n\\.ssh\\known_hosts',
			});

			expect(command).toBe(
				"ssh -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o UserKnownHostsFile='C:/n8n/.ssh/known_hosts' -o StrictHostKeyChecking=accept-new -i 'C:/n8n/.ssh/private-key'",
			);
		});

		it('should bound a stalled connection with connect and keepalive timeouts', () => {
			const command = buildSshCommand({
				privateKeyPath: '/data/.ssh/private-key',
				knownHostsPath: '/data/.ssh/known_hosts',
			});

			expect(command).toContain('-o ConnectTimeout=30');
			expect(command).toContain('-o ServerAliveInterval=15');
			expect(command).toContain('-o ServerAliveCountMax=3');
		});

		it('should quote shell metacharacters in paths', () => {
			const command = buildSshCommand({
				privateKeyPath: "/data/$(archive)/owner's/private-key",
				knownHostsPath: '/data/`archive`/known_hosts',
			});

			expect(command).toContain("-i '/data/$(archive)/owner'\"'\"'s/private-key'");
			expect(command).toContain("-o UserKnownHostsFile='/data/`archive`/known_hosts'");
		});
	});

	describe('generateSshKeyPair', () => {
		it('should generate a parseable ed25519 key pair carrying the comment', async () => {
			const keyPair = await generateSshKeyPair('ed25519', 'n8n git connection');

			expect(keyPair.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
			expect(keyPair.publicKey).toContain('ssh-ed25519');
			expect(keyPair.publicKey).toContain('n8n git connection');
		});

		it('should generate a parseable rsa key pair', async () => {
			const keyPair = await generateSshKeyPair('rsa', 'n8n git connection');

			expect(keyPair.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
			expect(keyPair.publicKey).toContain('ssh-rsa');
		});
	});

	describe('buildPromotionBranchName', () => {
		it('builds a git-safe branch name from the timestamp', () => {
			const name = buildPromotionBranchName(new Date('2026-09-01T10:15:30.123Z'));

			expect(name).toBe('n8n-promotion/2026-09-01T10-15-30-123Z');
		});
	});
});
