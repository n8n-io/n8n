import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { OnePasswordProvider, type OnePasswordContext } from '../one-password';

const mockListVaults = vi.fn();
const mockListItems = vi.fn();
const mockGetItemById = vi.fn();

vi.mock('@1password/connect', () => ({
	OnePasswordConnect: vi.fn(() => ({
		listVaults: mockListVaults,
		listItems: mockListItems,
		getItemById: mockGetItemById,
	})),
}));

describe('OnePasswordProvider', () => {
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);
	let provider: OnePasswordProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		provider = new OnePasswordProvider(logger);
	});

	describe('init validation', () => {
		it('should throw UserError when serverUrl is empty', async () => {
			const settings = { serverUrl: '', accessToken: 'test-token' };
			await expect(provider.init(mock<OnePasswordContext>({ settings }))).rejects.toThrow(
				UserError,
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to initialize 1Password provider',
				expect.objectContaining({
					providerName: 'onePassword',
					providerDisplayName: '1Password',
					operation: 'initialize',
					errorName: expect.any(String),
				}),
			);
		});

		it('should throw UserError when serverUrl is whitespace', async () => {
			const settings = { serverUrl: '   ', accessToken: 'test-token' };
			await expect(provider.init(mock<OnePasswordContext>({ settings }))).rejects.toThrow(
				UserError,
			);
		});

		it('should throw UserError when accessToken is empty', async () => {
			const settings = { serverUrl: 'http://localhost:8080', accessToken: '' };
			await expect(provider.init(mock<OnePasswordContext>({ settings }))).rejects.toThrow(
				UserError,
			);
		});

		it('should throw UserError when accessToken is whitespace', async () => {
			const settings = { serverUrl: 'http://localhost:8080', accessToken: '   ' };
			await expect(provider.init(mock<OnePasswordContext>({ settings }))).rejects.toThrow(
				UserError,
			);
		});

		it('should succeed with valid settings', async () => {
			const settings = { serverUrl: 'http://localhost:8080', accessToken: 'test-token' };
			await expect(provider.init(mock<OnePasswordContext>({ settings }))).resolves.not.toThrow();
		});
	});

	describe('connect', () => {
		it('should connect successfully when listVaults succeeds', async () => {
			await provider.init(
				mock<OnePasswordContext>({
					settings: { serverUrl: 'http://localhost:8080', accessToken: 'test-token' },
				}),
			);

			mockListVaults.mockResolvedValue([{ id: 'vault-1', name: 'My Vault' }]);

			await provider.connect();

			expect(provider.state).toBe('connected');
		});

		it('should transition to error state when connection fails', async () => {
			await provider.init(
				mock<OnePasswordContext>({
					settings: { serverUrl: 'http://localhost:8080', accessToken: 'bad-token' },
				}),
			);

			mockListVaults.mockRejectedValue(
				Object.assign(new Error('Unauthorized'), {
					response: { status: 401 },
				}),
			);

			await provider.connect();

			expect(provider.state).toBe('error');
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to connect 1Password provider',
				expect.objectContaining({
					providerName: 'onePassword',
					providerDisplayName: '1Password',
					operation: 'connect',
					errorName: 'Error',
					statusCode: 401,
					serverUrl: 'http://localhost:8080',
				}),
			);
		});
	});

	describe('test', () => {
		it('should return [true] when listVaults succeeds', async () => {
			await provider.init(
				mock<OnePasswordContext>({
					settings: { serverUrl: 'http://localhost:8080', accessToken: 'test-token' },
				}),
			);

			mockListVaults.mockResolvedValue([]);
			await provider.connect();

			mockListVaults.mockResolvedValue([{ id: 'vault-1' }]);
			const result = await provider.test();

			expect(result).toEqual([true]);
		});

		it('should return [false, "Connection refused"] when listVaults fails', async () => {
			await provider.init(
				mock<OnePasswordContext>({
					settings: { serverUrl: 'http://localhost:8080', accessToken: 'test-token' },
				}),
			);

			mockListVaults.mockResolvedValue([]);
			await provider.connect();

			mockListVaults.mockRejectedValue(
				Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' }),
			);
			const result = await provider.test();

			expect(result).toEqual([false, 'Connection refused']);
			expect(logger.warn).toHaveBeenCalledWith(
				'1Password provider test failed',
				expect.objectContaining({
					providerName: 'onePassword',
					providerDisplayName: '1Password',
					operation: 'test',
					errorName: 'Error',
					errorCode: 'ECONNREFUSED',
					endpoint: 'vaults',
					serverUrl: 'http://localhost:8080',
				}),
			);
		});
	});

	describe('update', () => {
		beforeEach(async () => {
			await provider.init(
				mock<OnePasswordContext>({
					settings: { serverUrl: 'http://localhost:8080', accessToken: 'test-token' },
				}),
			);

			mockListVaults.mockResolvedValue([{ id: 'vault-1', name: 'My Vault' }]);
			await provider.connect();
		});

		it('should fetch and cache secrets from all vaults', async () => {
			mockListVaults.mockResolvedValue([
				{ id: 'vault-1', name: 'Vault One' },
				{ id: 'vault-2', name: 'Vault Two' },
			]);

			mockListItems
				.mockResolvedValueOnce([
					{ id: 'item-1', title: 'Database Credentials' },
					{ id: 'item-2', title: 'API Key' },
				])
				.mockResolvedValueOnce([{ id: 'item-3', title: 'SSH Key' }]);

			mockGetItemById
				.mockResolvedValueOnce({
					fields: [
						{ label: 'username', value: 'admin' },
						{ label: 'password', value: 'secret123' },
					],
				})
				.mockResolvedValueOnce({
					fields: [{ label: 'key', value: 'sk-abc123' }],
				})
				.mockResolvedValueOnce({
					fields: [{ label: 'private_key', value: 'ssh-rsa AAAA...' }],
				});

			await provider.update();

			expect(mockListItems).toHaveBeenCalledWith('vault-1');
			expect(mockListItems).toHaveBeenCalledWith('vault-2');

			expect(mockGetItemById).toHaveBeenCalledWith('vault-1', 'item-1');
			expect(mockGetItemById).toHaveBeenCalledWith('vault-1', 'item-2');
			expect(mockGetItemById).toHaveBeenCalledWith('vault-2', 'item-3');

			expect(provider.getSecret('Database Credentials')).toEqual({
				username: 'admin',
				password: 'secret123',
			});
			expect(provider.getSecret('API Key')).toEqual({ key: 'sk-abc123' });
			expect(provider.getSecret('SSH Key')).toEqual({ private_key: 'ssh-rsa AAAA...' });
			expect(provider.getSecretNames()).toHaveLength(3);
		});

		it('should skip items without fields', async () => {
			mockListVaults.mockResolvedValue([{ id: 'vault-1', name: 'Vault' }]);

			mockListItems.mockResolvedValue([
				{ id: 'item-1', title: 'Empty Item' },
				{ id: 'item-2', title: 'Valid Item' },
			]);

			mockGetItemById.mockResolvedValueOnce({ fields: [] }).mockResolvedValueOnce({
				fields: [{ label: 'key', value: 'value' }],
			});

			await provider.update();

			expect(provider.hasSecret('Empty Item')).toBe(false);
			expect(provider.hasSecret('Valid Item')).toBe(true);
		});

		it('should skip fields without labels or values', async () => {
			mockListVaults.mockResolvedValue([{ id: 'vault-1', name: 'Vault' }]);

			mockListItems.mockResolvedValue([{ id: 'item-1', title: 'Mixed Item' }]);

			mockGetItemById.mockResolvedValue({
				fields: [
					{ label: 'valid', value: 'data' },
					{ label: '', value: 'no-label' },
					{ label: 'no-value', value: '' },
					{ label: undefined, value: 'undefined-label' },
					{ label: 'null-value', value: undefined },
				],
			});

			await provider.update();

			expect(provider.getSecret('Mixed Item')).toEqual({ valid: 'data' });
		});

		it('should skip items without id or title', async () => {
			mockListVaults.mockResolvedValue([{ id: 'vault-1', name: 'Vault' }]);

			mockListItems.mockResolvedValue([
				{ id: undefined, title: 'No ID' },
				{ id: 'item-1', title: undefined },
				{ id: 'item-2', title: 'Valid' },
			]);

			mockGetItemById.mockResolvedValue({
				fields: [{ label: 'key', value: 'value' }],
			});

			await provider.update();

			expect(mockGetItemById).toHaveBeenCalledTimes(1);
			expect(mockGetItemById).toHaveBeenCalledWith('vault-1', 'item-2');
			expect(provider.hasSecret('Valid')).toBe(true);
		});

		it('should skip vaults without id', async () => {
			mockListVaults.mockResolvedValue([
				{ id: undefined, name: 'No ID Vault' },
				{ id: 'vault-1', name: 'Valid Vault' },
			]);

			mockListItems.mockResolvedValue([{ id: 'item-1', title: 'Secret' }]);

			mockGetItemById.mockResolvedValue({
				fields: [{ label: 'key', value: 'value' }],
			});

			await provider.update();

			expect(mockListItems).toHaveBeenCalledTimes(1);
			expect(mockListItems).toHaveBeenCalledWith('vault-1');
		});

		it('should skip items where all fields lack values', async () => {
			mockListVaults.mockResolvedValue([{ id: 'vault-1', name: 'Vault' }]);

			mockListItems.mockResolvedValue([{ id: 'item-1', title: 'Empty Fields' }]);

			mockGetItemById.mockResolvedValue({
				fields: [
					{ label: 'field1', value: '' },
					{ label: 'field2', value: undefined },
				],
			});

			await provider.update();

			expect(provider.hasSecret('Empty Fields')).toBe(false);
		});

		it('should log and rethrow update failures', async () => {
			mockListVaults.mockRejectedValue(new Error('Service unavailable'));

			await expect(provider.update()).rejects.toThrow('Service unavailable');

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to update 1Password provider secrets',
				expect.objectContaining({
					providerName: 'onePassword',
					providerDisplayName: '1Password',
					operation: 'update',
					errorName: 'Error',
					endpoint: 'secrets',
					serverUrl: 'http://localhost:8080',
				}),
			);
		});
	});

	describe('getSecret / hasSecret / getSecretNames', () => {
		it('should return undefined for non-existent secrets', () => {
			expect(provider.getSecret('non-existent')).toBeUndefined();
		});

		it('should return false for non-existent secrets', () => {
			expect(provider.hasSecret('non-existent')).toBe(false);
		});
	});
});
