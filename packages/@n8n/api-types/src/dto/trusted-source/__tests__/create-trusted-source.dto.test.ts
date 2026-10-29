import { CreateTrustedSourceDto } from '../create-trusted-source.dto';

const config = {
	version: 1,
	authentication: { type: 'oauth2' },
	surfaces: { 'public-api': {} },
};

const request = (overrides: Record<string, unknown> = {}) => ({
	name: 'Acme',
	issuer: 'https://acme.example.com',
	config,
	...overrides,
});

describe('CreateTrustedSourceDto', () => {
	test('parses a minimal request and fills the config defaults', () => {
		const result = CreateTrustedSourceDto.safeParse(request());

		expect(result.success).toBe(true);
		expect(result.data?.config.identity.subject).toBe('binding');
	});

	test('keeps the path of an issue raised by the config schema', () => {
		const result = CreateTrustedSourceDto.safeParse(
			request({ config: { ...config, identity: { subject: 'n8n-user-id' } } }),
		);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]).toMatchObject({ path: ['config', 'identity', 'subject'] });
	});

	test.each([
		{ name: 'at the top level', config: { ...config, typo: true }, path: ['config'] },
		{
			name: 'named like a prototype member',
			config: { ...config, constructor: true },
			path: ['config'],
			key: 'constructor',
		},
		{
			name: 'in a nested block',
			config: { ...config, identity: { typo: true } },
			path: ['config', 'identity'],
		},
		{
			name: 'in an array item',
			config: {
				...config,
				identity: {
					roleMapping: {
						mode: 'continuous',
						fallbackInstanceRole: 'global:member',
						instanceRoleRules: [
							{ id: 'r1', expression: 'true', role: 'global:admin', enabled: true, typo: true },
						],
					},
				},
			},
			path: ['config', 'identity', 'roleMapping', 'instanceRoleRules', 0],
		},
	])('refuses an unknown config key $name', ({ config, path, key = 'typo' }) => {
		const result = CreateTrustedSourceDto.safeParse(request({ config }));

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]).toMatchObject({
			code: 'unrecognized_keys',
			keys: [key],
			path,
		});
	});
});
