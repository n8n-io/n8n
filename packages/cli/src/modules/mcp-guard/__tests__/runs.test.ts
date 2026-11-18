import { OperationalError } from 'n8n-workflow';

import type { GymAdmin } from '../gym-admin';
import type { HydrationModel } from '../hydration-llm';
import { RunRegistry } from '../runs';
import { LINEAR_PROFILE } from '../services';

vi.mock('../mcp-upstream', () => ({
	createMcpCaller: vi.fn(() => ({
		listTools: async () => [],
		callTool: async () => ({ content: [] }),
	})),
}));

const model: HydrationModel = { resolve: async () => ({}) as never };

describe('RunRegistry', () => {
	let admin: {
		createTenant: ReturnType<typeof vi.fn>;
		seed: ReturnType<typeof vi.fn>;
		issueMcpCredential: ReturnType<typeof vi.fn>;
		tenantExists: ReturnType<typeof vi.fn>;
		deleteTenant: ReturnType<typeof vi.fn>;
	};
	let registry: RunRegistry;

	beforeEach(() => {
		vi.stubEnv('MCP_GUARD_HYDRATION', 'plan');
		admin = {
			createTenant: vi.fn(async () => undefined),
			seed: vi.fn(async () => ({})),
			issueMcpCredential: vi.fn(async () => 'gym-token'),
			tenantExists: vi.fn(async () => true),
			deleteTenant: vi.fn(async () => undefined),
		};
		registry = new RunRegistry({
			profile: LINEAR_PROFILE,
			admin: admin as unknown as GymAdmin,
			upstreamMcpUrl: 'https://mcp.linear.app/mcp',
			gymMcpUrl: 'http://127.0.0.1:8080/mcp',
		});
	});

	afterEach(() => vi.unstubAllEnvs());

	it('should create a tenant for a new run and give it an account and a credential', async () => {
		const run = await registry.getOrCreate('Agent_1-Chat 2', 'real-token', model);
		expect(run.tenant).toBe('guard-agent-1-chat-2');
		expect(admin.createTenant).toHaveBeenCalledWith('guard-agent-1-chat-2');
		expect(admin.seed).toHaveBeenCalledWith(run.tenant, LINEAR_PROFILE.placeholderSeed);
		expect(admin.issueMcpCredential).toHaveBeenCalledWith(
			run.tenant,
			'linear',
			LINEAR_PROFILE.credentialKind,
			LINEAR_PROFILE.credentialField,
		);
	});

	it('should reuse the run of a chat and take the new token', async () => {
		const first = await registry.getOrCreate('a-1', 'token-1', model);
		const second = await registry.getOrCreate('a-1', 'token-2', model);
		expect(second).toBe(first);
		expect(second.tokenRef.value).toBe('token-2');
		expect(admin.createTenant).toHaveBeenCalledTimes(1);
	});

	it('should build the run again when someone deleted the tenant', async () => {
		const first = await registry.getOrCreate('a-1', 'token', model);
		admin.tenantExists.mockResolvedValue(false);
		const second = await registry.getOrCreate('a-1', 'token', model);
		expect(second).not.toBe(first);
		expect(admin.createTenant).toHaveBeenCalledTimes(2);
	});

	it('should set up a run once for concurrent first requests', async () => {
		const runs = await Promise.all([
			registry.getOrCreate('a-1', 'token', model),
			registry.getOrCreate('a-1', 'token', model),
			registry.getOrCreate('a-1', 'token', model),
		]);
		expect(new Set(runs).size).toBe(1);
		expect(admin.createTenant).toHaveBeenCalledTimes(1);
	});

	it('should refuse a run without the model of the agent', async () => {
		await expect(registry.getOrCreate('a-1', 'token')).rejects.toBeInstanceOf(OperationalError);
		expect(admin.createTenant).not.toHaveBeenCalled();
	});

	it('should delete the tenant of a run', async () => {
		const run = await registry.getOrCreate('a-1', 'token', model);
		expect(await registry.delete('a-1')).toBe(true);
		expect(admin.deleteTenant).toHaveBeenCalledWith(run.tenant);
		expect(await registry.delete('a-1')).toBe(false);
	});

	it('should delete the tenant of an idle run when it creates another run', async () => {
		const old = await registry.getOrCreate('old-chat', 'token', model);
		old.lastUsed = Date.now() - 7 * 60 * 60 * 1000;
		await registry.getOrCreate('new-chat', 'token', model);
		expect(admin.deleteTenant).toHaveBeenCalledWith(old.tenant);
	});
});
