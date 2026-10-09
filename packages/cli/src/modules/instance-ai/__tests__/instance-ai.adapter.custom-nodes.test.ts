// Mock the barrel import so importing the adapter module doesn't pull the full
// @n8n/instance-ai runtime; these tests exercise only the custom node adapter.
vi.mock('@n8n/instance-ai', () => ({
	wrapUntrustedData: (content: string) => content,
	builderTemplatesOptionsFromEnv: () => ({}),
	deriveCredentialHosts: () => [],
	BuilderTemplatesService: class {},
	currentBuildTracingContext: () => undefined,
}));

vi.mock('@n8n/ai-utilities', () => ({
	braveSearch: vi.fn(),
	searxngSearch: vi.fn(),
}));

import type { User } from '@n8n/db';

import { createCustomNodeAdapter } from '../instance-ai.adapter.service';

const userWithScopes = (slugs: string[]) =>
	({ id: 'user-1', role: { slug: 'global:x', scopes: slugs.map((slug) => ({ slug })) } }) as User;

const packed = { manifest: { id: 'acme.task.create' }, bundle: 'bundle' };

describe('createCustomNodeAdapter', () => {
	it('refuses a user without nodeDefinition:upload and does not load the service', async () => {
		const getService = vi.fn();
		const adapter = createCustomNodeAdapter(
			userWithScopes(['nodeDefinition:list']),
			true,
			getService,
		);

		await expect(adapter.test(packed, {}, undefined)).rejects.toThrow('owner or admin');
		await expect(adapter.publish(packed, { executions: [] })).rejects.toThrow('owner or admin');
		expect(getService).not.toHaveBeenCalled();
	});

	it('delegates to the service for a user with nodeDefinition:upload', async () => {
		const user = userWithScopes(['nodeDefinition:upload']);
		const service = {
			testPacked: vi.fn().mockResolvedValue({ status: 'success', items: [] }),
			publishPacked: vi
				.fn()
				.mockResolvedValue({ id: 'acme.task.create', semver: '1.1.0', bundleHash: 'h' }),
		};
		const adapter = createCustomNodeAdapter(user, true, async () => await Promise.resolve(service));

		await adapter.test(packed, { a: 1 }, 'cred-1');
		const published = await adapter.publish(packed, { executions: [{}] });

		expect(service.testPacked).toHaveBeenCalledWith(packed, { a: 1 }, 'cred-1', user);
		expect(service.publishPacked).toHaveBeenCalledWith(
			packed,
			{ executions: [{}] },
			{ userId: 'user-1' },
		);
		expect(published).toEqual({ id: 'acme.task.create', semver: '1.1.0' });
	});

	it('returns no items and no error details when parameter values may not be sent', async () => {
		const user = userWithScopes(['nodeDefinition:upload']);
		const fixture = { name: 'test', params: {}, routes: [], output: [{ secret: 'value' }] };
		const testPacked = vi
			.fn()
			.mockResolvedValueOnce({ status: 'success', items: [{ secret: 'value' }], fixture })
			.mockResolvedValueOnce({ status: 'error', items: [], error: 'Upstream body: secret value' });
		const adapter = createCustomNodeAdapter(user, false, async () => ({
			testPacked,
			publishPacked: vi.fn(),
		}));

		await expect(adapter.test(packed, {}, undefined)).resolves.toEqual({
			status: 'success',
			items: [],
			fixture,
		});
		const failed = await adapter.test(packed, {}, undefined);
		expect(failed).toEqual({ status: 'error', items: [], error: expect.any(String) });
		expect(failed.error).not.toContain('secret');
	});
});
