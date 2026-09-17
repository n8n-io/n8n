import { Container } from '@n8n/di';

import { ExternalSecretsConfig } from '../external-secrets.config';

describe('ExternalSecretsConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_EXTERNAL_SECRETS_CONNECT_TIMEOUT;
		delete process.env.N8N_EXTERNAL_SECRETS_REFRESH_TIMEOUT;
	});

	it('reads the timeouts from their environment variables', () => {
		process.env.N8N_EXTERNAL_SECRETS_CONNECT_TIMEOUT = '5';
		process.env.N8N_EXTERNAL_SECRETS_REFRESH_TIMEOUT = '90';

		const config = Container.get(ExternalSecretsConfig);

		expect(config.connectTimeout).toBe(5);
		expect(config.refreshTimeout).toBe(90);
	});

	it.each(['0', '-1', '1.5', '2147484', 'abc'])(
		'falls back to the default timeout when given %s',
		(value) => {
			process.env.N8N_EXTERNAL_SECRETS_CONNECT_TIMEOUT = value;
			process.env.N8N_EXTERNAL_SECRETS_REFRESH_TIMEOUT = value;

			const config = Container.get(ExternalSecretsConfig);

			expect(config.connectTimeout).toBe(20);
			expect(config.refreshTimeout).toBe(20);
		},
	);
});
