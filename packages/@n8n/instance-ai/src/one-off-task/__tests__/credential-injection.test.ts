import type { OneOffTaskCredentialResolver, ResolvedCredentialEnv } from '../contracts';
import { resolveTaskCredentials } from '../credential-injection';

const resolver: OneOffTaskCredentialResolver = {
	resolveForOneOffTask: vi.fn(
		async ({ credentialId }: { credentialId: string }): Promise<ResolvedCredentialEnv> => {
			if (credentialId === 'cred-google') {
				return await Promise.resolve({
					envVars: { N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN: 'ya29.secret-token' },
					expiresAt: '2026-08-12T12:00:00Z',
				});
			}
			return {
				envVars: {
					N8N_TASK_STRIPE_API_KEY: 'sk-live-abc123',
					N8N_TASK_STRIPE_PUBLISHABLE_KEY: 'pk-live-def456',
				},
			};
		},
	),
};

describe('resolveTaskCredentials', () => {
	beforeEach(() => vi.clearAllMocks());

	it('builds the env map, manifest, scrub list, and contract credentials', async () => {
		const resolved = await resolveTaskCredentials(
			resolver,
			[
				{ credentialId: 'cred-google', name: 'Google Sheets', type: 'googleSheetsOAuth2Api' },
				{ credentialId: 'cred-stripe', name: 'Stripe', type: 'stripeApi' },
			],
			{ userId: 'user-1', projectId: 'project-1' },
		);

		// Env map: all values, exactly as resolved.
		expect(resolved.env).toEqual({
			N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN: 'ya29.secret-token',
			N8N_TASK_STRIPE_API_KEY: 'sk-live-abc123',
			N8N_TASK_STRIPE_PUBLISHABLE_KEY: 'pk-live-def456',
		});

		// Manifest: names + labels only — never values.
		expect(resolved.manifest).toEqual({
			version: 1,
			secrets: [
				{ envVar: 'N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN', label: 'GOOGLE_SHEETS_ACCESS_TOKEN' },
				{ envVar: 'N8N_TASK_STRIPE_API_KEY', label: 'STRIPE_API_KEY' },
				{ envVar: 'N8N_TASK_STRIPE_PUBLISHABLE_KEY', label: 'STRIPE_PUBLISHABLE_KEY' },
			],
		});
		expect(JSON.stringify(resolved.manifest)).not.toContain('ya29.secret-token');
		expect(JSON.stringify(resolved.manifest)).not.toContain('sk-live-abc123');

		// Scrub list pairs each value with the manifest label.
		expect(resolved.scrubSecrets).toContainEqual({
			value: 'ya29.secret-token',
			label: 'GOOGLE_SHEETS_ACCESS_TOKEN',
		});
		expect(resolved.scrubSecrets).toContainEqual({
			value: 'sk-live-abc123',
			label: 'STRIPE_API_KEY',
		});

		// Contract credentials: env var names with recovered field names.
		expect(resolved.injectedCredentials).toEqual([
			{
				name: 'Google Sheets',
				type: 'googleSheetsOAuth2Api',
				envVars: [{ envVar: 'N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN', field: 'access_token' }],
			},
			{
				name: 'Stripe',
				type: 'stripeApi',
				envVars: [
					{ envVar: 'N8N_TASK_STRIPE_API_KEY', field: 'api_key' },
					{ envVar: 'N8N_TASK_STRIPE_PUBLISHABLE_KEY', field: 'publishable_key' },
				],
			},
		]);
	});

	it('passes userId and projectId through to the resolver', async () => {
		await resolveTaskCredentials(
			resolver,
			[{ credentialId: 'cred-google', name: 'Google Sheets', type: 'googleSheetsOAuth2Api' }],
			{ userId: 'user-1', projectId: 'project-1' },
		);
		expect(resolver.resolveForOneOffTask).toHaveBeenCalledWith({
			credentialId: 'cred-google',
			userId: 'user-1',
			projectId: 'project-1',
		});
	});
});
