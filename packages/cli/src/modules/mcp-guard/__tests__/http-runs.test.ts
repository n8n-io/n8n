import { HttpRunRegistry } from '../http-runs';
import { GMAIL_PROFILE } from '../http-profiles';
import type { GymAdmin } from '../gym-admin';
import type { HydrationModel } from '../hydration-llm';
import { loadVendorKnowledge } from '../vendor-knowledge';

vi.mock('../net-interceptor', () => ({
	sendToNetwork: vi.fn(async () => new Response('{}')),
}));

const model: HydrationModel = { resolve: async () => ({}) as never };

function setup(tenantExists = true) {
	const admin = {
		createTenant: vi.fn(async (_t: string) => {}),
		seed: vi.fn(async (..._a: unknown[]) => ({})),
		issueMcpCredential: vi.fn(async (..._a: unknown[]) => 'tenant-token'),
		tenantExists: vi.fn(async (_t: string) => tenantExists),
		deleteTenant: vi.fn(async (_t: string) => {}),
	};
	const registry = new HttpRunRegistry({
		profile: GMAIL_PROFILE,
		vendor: loadVendorKnowledge('gmail'),
		admin: admin as unknown as GymAdmin,
		gymUrl: 'http://127.0.0.1:8083',
	});
	return { registry, admin };
}

describe('HttpRunRegistry', () => {
	it('creates one tenant for a chat, seeds the placeholder and issues the credential', async () => {
		const { registry, admin } = setup();

		await registry.getOrCreate('Agent1-Chat1', model);

		expect(admin.createTenant).toHaveBeenCalledWith('guard-agent1-chat1');
		expect(admin.seed).toHaveBeenCalledWith('guard-agent1-chat1', GMAIL_PROFILE.placeholderSeed);
		expect(admin.issueMcpCredential).toHaveBeenCalledWith(
			'guard-agent1-chat1',
			'gmail',
			'google_oauth',
			'oauthTokenData.access_token',
		);
	});

	it('reuses the run of the same chat and makes a new one for another chat', async () => {
		const { registry, admin } = setup();

		const a = await registry.getOrCreate('agent-a', model);
		const again = await registry.getOrCreate('agent-a', model);
		const b = await registry.getOrCreate('agent-b', model);

		expect(again).toBe(a);
		expect(b).not.toBe(a);
		expect(admin.createTenant).toHaveBeenCalledTimes(2);
	});

	it('creates one tenant when two requests of a new chat come at once', async () => {
		const { registry, admin } = setup();

		await Promise.all([
			registry.getOrCreate('agent-a', model),
			registry.getOrCreate('agent-a', model),
		]);

		expect(admin.createTenant).toHaveBeenCalledTimes(1);
	});

	it('builds the run again when the tenant was deleted in the gym', async () => {
		const { registry, admin } = setup(false);

		await registry.getOrCreate('agent-a', model);
		await registry.getOrCreate('agent-a', model);

		expect(admin.createTenant).toHaveBeenCalledTimes(2);
	});

	it('cleans a tenant name', async () => {
		const { registry, admin } = setup();

		await registry.getOrCreate('Agent X/1:chat', model);

		expect(admin.createTenant).toHaveBeenCalledWith('guard-agent-x-1-chat');
	});

	it('deletes the tenant of a run', async () => {
		const { registry, admin } = setup();
		await registry.getOrCreate('agent-a', model);

		expect(await registry.delete('agent-a')).toBe(true);
		expect(admin.deleteTenant).toHaveBeenCalledWith('guard-agent-a');
		expect(await registry.delete('agent-a')).toBe(false);
	});
});
