import { mock } from 'jest-mock-extended';
import type { ExternalSecretsManager } from '../external-secrets-manager.ee';
import { ExternalSecretsService } from '../external-secrets.service.ee';
import type { SecretsProvider } from '../types';

describe('ExternalSecretsService', () => {
	let service: ExternalSecretsService;
	let provider: SecretsProvider;

	beforeEach(() => {
		service = new ExternalSecretsService(mock<ExternalSecretsManager>());
		provider = mock<SecretsProvider>();
	});

	describe('redact', () => {
		it('should redact oauthTokenData', () => {
			const data = { oauthTokenData: 'password' };
			const result = service.redact(data, provider);
			expect(result.oauthTokenData).toContain('__n8n_BLANK_VALUE_');
		});

		it('should do nothing if the prop is not found', () => {
			provider.properties = [];
			const data = { secret: 'password' };
			const result = service.redact(data, provider);
			expect(result.secret).toBe('password');
		});

		it('should do nothing if the prop is not a password', () => {
			provider.properties = [
				{
					name: 'notASecret',
					type: 'string',
					displayName: 'Secret',
					default: 'safe-value',
					typeOptions: {
						password: false,
					},
				},
			];
			const data = { notASecret: 'safe-value' };
			const result = service.redact(data, provider);
			expect(result.notASecret).toBe('safe-value');
		});

		it('should do nothing if the data value starts with =', () => {
			provider.properties = [
				{
					name: 'secret',
					type: 'string',
					displayName: 'Secret',
					default: 'password',
					typeOptions: {
						password: true,
					},
				},
			];
			const data = { secret: '=password' };
			const result = service.redact(data, provider);
			expect(result.secret).toBe('=password');
		});

		it('should redact secrets if the data value does not start with = and the prop is a password', () => {
			provider.properties = [
				{
					name: 'secret',
					type: 'string',
					required: true,
					displayName: 'Secret',
					default: 'password',
					typeOptions: {
						password: true,
					},
				},
			];

			const data = { secret: 'password' };
			const result = service.redact(data, provider);
			expect(result.secret).toContain('__n8n_BLANK_VALUE_');
		});

		it('should redact secrets if the data value starts with =, but the noDataExpression is true', () => {
			provider.properties = [
				{
					name: 'secret',
					type: 'string',
					required: true,
					displayName: 'Secret',
					default: 'password',
					noDataExpression: true,
					typeOptions: {
						password: true,
					},
				},
			];
			const data = { secret: '=password' };
			const result = service.redact(data, provider);
			expect(result.secret).toContain('__n8n_BLANK_VALUE_');
		});

		it('should do nothing if the data value is not a string', () => {
			provider.properties = [
				{
					name: 'secret',
					type: 'string',
					required: true,
					displayName: 'Secret',
					default: 'password',
					typeOptions: {
						password: true,
					},
				},
			];
			const data = { secret: 123 };
			const result = service.redact(data, provider);
			expect(result.secret).toBe(123);
		});
	});
});
