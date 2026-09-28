import { externalSecretsConfigFileConnectionSchema } from '../external-secrets-config-file.schema';

describe('externalSecretsConfigFileConnectionSchema', () => {
	const validEntry = {
		key: 'vaultProd',
		type: 'vault',
		settings: { url: 'https://vault.example.com' },
	};

	test('accepts a valid entry', () => {
		const result = externalSecretsConfigFileConnectionSchema.safeParse(validEntry);
		expect(result.success).toBe(true);
	});

	test('rejects an unknown top-level field instead of silently stripping it', () => {
		const result = externalSecretsConfigFileConnectionSchema.safeParse({
			...validEntry,
			projectIDs: ['abc'], // typo: capital IDs
		});

		expect(result.success).toBe(false);
	});

	test('rejects duplicate project IDs', () => {
		const result = externalSecretsConfigFileConnectionSchema.safeParse({
			...validEntry,
			projectIds: ['project-1', 'project-1'],
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toMatch(/duplicate project/);
		}
	});

	test('accepts distinct project IDs', () => {
		const result = externalSecretsConfigFileConnectionSchema.safeParse({
			...validEntry,
			projectIds: ['project-1', 'project-2'],
		});

		expect(result.success).toBe(true);
	});
});
