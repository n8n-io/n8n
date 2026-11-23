import { HttpRunRegistry } from '../http-runs';
import { GMAIL_PROFILE } from '../http-profiles';
import type { GymAdmin } from '../gym-admin';
import type { HydrationModel } from '../hydration-llm';
import { sendToNetwork } from '../network';
import { loadVendorKnowledge } from '../vendor-knowledge';

vi.mock('../network', () => ({
	sendToNetwork: vi.fn(async () => new Response('{}')),
}));

const model: HydrationModel = { resolve: async () => ({}) as never };

function setup(tenantExists = true, gymUrl = 'http://127.0.0.1:8083') {
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
		gymUrl,
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

	it('asks the gym for the service name of the profile when it differs from the file name', async () => {
		const { admin } = setup();
		const registry = new HttpRunRegistry({
			profile: { ...GMAIL_PROFILE, gymService: 'google-gmail' },
			vendor: loadVendorKnowledge('gmail'),
			admin: admin as unknown as GymAdmin,
			gymUrl: 'http://127.0.0.1:8083',
		});

		await registry.getOrCreate('agent-x', model);

		expect(admin.issueMcpCredential).toHaveBeenCalledWith(
			'guard-agent-x',
			'google-gmail',
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

	it('keeps the run when the gym cannot delete the tenant, so a later delete tries again', async () => {
		const { registry, admin } = setup();
		await registry.getOrCreate('agent-a', model);
		admin.deleteTenant.mockRejectedValueOnce(new Error('gym down'));

		await expect(registry.delete('agent-a')).rejects.toThrow('gym down');
		expect(await registry.delete('agent-a')).toBe(true);
	});

	it('deletes the tenant of a run', async () => {
		const { registry, admin } = setup();
		await registry.getOrCreate('agent-a', model);

		expect(await registry.delete('agent-a')).toBe(true);
		expect(admin.deleteTenant).toHaveBeenCalledWith('guard-agent-a');
		expect(await registry.delete('agent-a')).toBe(false);
	});

	it('reads the real service with the credential of the request, and falls back to the gym', async () => {
		const send = vi.mocked(sendToNetwork);
		send.mockClear();
		// Port 1 has no gym, so the answer does not depend on a gym that runs on this machine.
		const { registry } = setup(true, 'http://127.0.0.1:1');
		const run = await registry.getOrCreate('agent-r', model);

		const res = await run.router.handle({
			method: 'GET',
			url: new URL('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=3'),
			headers: { authorization: 'Bearer real-token' },
		});

		const sent = send.mock.calls[0][0];
		expect(sent.url.protocol).toBe('https:');
		expect(sent.headers.authorization).toBe('Bearer real-token');
		expect(sent.headers.accept).toBe('application/json');
		// The gym of the test does not run, so the router answers with an error.
		expect(res.status).toBe(502);
	});

	it('deletes the tenant of a chat that nobody used for a long time when a new chat starts', async () => {
		vi.useFakeTimers();
		try {
			const { registry, admin } = setup();
			await registry.getOrCreate('agent-old', model);

			vi.setSystemTime(Date.now() + 7 * 60 * 60 * 1000);
			await registry.getOrCreate('agent-new', model);

			expect(admin.deleteTenant).toHaveBeenCalledWith('guard-agent-old');
		} finally {
			vi.useRealTimers();
		}
	});

	it('uses one tenant for the vendors of the same chat, and seeds and signs in each of them', async () => {
		const { registry, admin } = setup();
		const other = new HttpRunRegistry({
			profile: { ...GMAIL_PROFILE, name: 'other' },
			vendor: loadVendorKnowledge('gmail'),
			admin: admin as unknown as GymAdmin,
			gymUrl: 'http://127.0.0.1:8083',
		});

		const a = await registry.getOrCreate('agent-a-chat-1', model);
		const b = await other.getOrCreate('agent-a-chat-1', model);

		expect(a.tenant).toBe('guard-agent-a-chat-1');
		expect(b.tenant).toBe('guard-agent-a-chat-1');
		expect(admin.seed).toHaveBeenCalledTimes(2);
		expect(admin.issueMcpCredential).toHaveBeenCalledTimes(2);
	});
});
