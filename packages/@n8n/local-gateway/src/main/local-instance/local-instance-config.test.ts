import {
	buildLocalInstanceEnv,
	generateOwnerPassword,
	resolveN8nBinPath,
	resolveOllamaModel,
} from './local-instance-config';

describe('local-instance-config', () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	describe('buildLocalInstanceEnv', () => {
		const baseOptions = { userDataDir: '/tmp/user-data', anthropicApiKey: null };

		it('always sets the instance-ai and MCP env required by the embedded instance', () => {
			const env = buildLocalInstanceEnv(baseOptions);

			expect(env).toMatchObject({
				ELECTRON_RUN_AS_NODE: '1',
				N8N_PORT: '5680',
				N8N_RUNNERS_BROKER_PORT: '5681',
				N8N_LISTEN_ADDRESS: '127.0.0.1',
				N8N_SECURE_COOKIE: 'false',
				N8N_USER_FOLDER: '/tmp/user-data/local-n8n',
				N8N_AI_ENABLED: 'true',
				N8N_INSTANCE_AI_SANDBOX_ENABLED: 'true',
				N8N_ENABLED_MODULES: 'instance-ai,mcp-registry,agents',
				N8N_MCP_MANAGED_BY_ENV: 'true',
				N8N_MCP_ACCESS_ENABLED: 'true',
			});
		});

		it('defaults to the local ollama model when no Anthropic key is provided', () => {
			const env = buildLocalInstanceEnv(baseOptions);

			expect(env.N8N_INSTANCE_AI_MODEL).toBe('ollama/gemma4');
			expect(env.ANTHROPIC_API_KEY).toBeUndefined();
		});

		it('uses Anthropic when a key is provided (dev/testing override)', () => {
			const env = buildLocalInstanceEnv({ ...baseOptions, anthropicApiKey: 'sk-test' });

			expect(env.N8N_INSTANCE_AI_MODEL).toBe('anthropic/claude-sonnet-4-6');
			expect(env.ANTHROPIC_API_KEY).toBe('sk-test');
		});

		it('honors the ollama model override', () => {
			vi.stubEnv('N8N_LOCAL_GATEWAY_OLLAMA_MODEL', 'gemma4:27b');

			expect(resolveOllamaModel()).toBe('gemma4:27b');
			expect(buildLocalInstanceEnv(baseOptions).N8N_INSTANCE_AI_MODEL).toBe('ollama/gemma4:27b');
		});
	});

	describe('generateOwnerPassword', () => {
		it('satisfies the n8n password rules and is unique per call', () => {
			const password = generateOwnerPassword();

			expect(password.length).toBeGreaterThanOrEqual(8);
			expect(password).toMatch(/\d/);
			expect(password).toMatch(/[A-Z]/);
			expect(generateOwnerPassword()).not.toBe(password);
		});
	});

	describe('resolveN8nBinPath', () => {
		it('prefers the explicit override', () => {
			vi.stubEnv('N8N_LOCAL_GATEWAY_N8N_BIN', '/custom/bin/n8n');

			expect(resolveN8nBinPath()).toBe('/custom/bin/n8n');
		});

		it('falls back to the monorepo CLI path', () => {
			expect(resolveN8nBinPath()).toMatch(/packages\/cli\/bin\/n8n$/);
		});
	});
});
