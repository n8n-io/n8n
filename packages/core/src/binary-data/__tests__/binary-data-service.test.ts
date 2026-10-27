import type { Logger } from '@n8n/backend-common';
import { sign, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { IBinaryData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ErrorReporter } from '@/errors';

import type { BinaryDataConfig } from '../binary-data.config';
import { BinaryDataService } from '../binary-data.service';
import type { BinaryData } from '../types';

const now = new Date('2025-01-01T01:23:45.678Z');
vi.useFakeTimers({ now });

describe('BinaryDataService', () => {
	const signingSecret = 'test-signing-secret';
	const config = mock<BinaryDataConfig>({ signingSecret });
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();
	const binaryData = mock<IBinaryData>({ id: 'filesystem:id_123' });
	const validToken = sign({ id: binaryData.id }, signingSecret, { expiresIn: '1 day' });

	let service: BinaryDataService;
	beforeEach(() => {
		vi.resetAllMocks();

		config.signingSecret = signingSecret;
		service = new BinaryDataService(config, errorReporter, logger);
	});

	describe('createSignedToken', () => {
		it('should throw for binary-data without an id', () => {
			const binaryData = mock<IBinaryData>({ id: undefined });

			expect(() => service.createSignedToken(binaryData)).toThrow();
		});

		it('should create a signed token for valid binary-data', () => {
			const token = service.createSignedToken(binaryData);

			expect(token).toBe(validToken);
		});
	});

	describe('validateSignedToken', () => {
		const invalidToken = sign({ id: binaryData.id }, 'fake-secret');
		const expiredToken = sign({ id: binaryData.id }, signingSecret, { expiresIn: '-1 day' });

		it('should throw on invalid tokens', () => {
			expect(() => service.validateSignedToken(invalidToken)).toThrow(JsonWebTokenError);
		});

		it('should throw on expired tokens', () => {
			expect(() => service.validateSignedToken(expiredToken)).toThrow(TokenExpiredError);
		});

		it('should return binary-data id on valid tokens', () => {
			const result = service.validateSignedToken(validToken);
			expect(result).toBe(binaryData.id);
		});
	});

	describe('deleteMany', () => {
		const locations: BinaryData.FileLocation[] = [
			{ type: 'execution', workflowId: 'w', executionId: 'e' },
		];

		const setup = (mode: BinaryData.ServiceMode) => {
			const fsManager = mock<BinaryData.Manager>();
			const azureManager = mock<BinaryData.Manager>();
			const s3Manager = mock<BinaryData.Manager>();
			const databaseManager = mock<BinaryData.Manager>();
			// The `ServiceMode` type does not accept `filesystem`, so this test cannot call `setManager`.
			// `init()` assigns that key on `managers` directly.
			Object.assign(service, {
				mode,
				managers: {
					filesystem: fsManager,
					'filesystem-v2': fsManager,
					azure: azureManager,
					s3: s3Manager,
					database: databaseManager,
				},
			});
			return { fsManager, azureManager, s3Manager, databaseManager };
		};

		it('should delete from both Azure and disk in azure mode', async () => {
			const { fsManager, azureManager } = setup('azure');

			await service.deleteMany(locations);

			expect(azureManager.deleteMany).toHaveBeenCalledWith(locations);
			expect(fsManager.deleteMany).toHaveBeenCalledWith(locations);
		});

		it('should delete only from S3 in s3 mode', async () => {
			const { fsManager, azureManager, s3Manager } = setup('s3');

			await service.deleteMany(locations);

			expect(s3Manager.deleteMany).toHaveBeenCalledWith(locations);
			expect(fsManager.deleteMany).not.toHaveBeenCalled();
			expect(azureManager.deleteMany).not.toHaveBeenCalled();
		});

		it('should delete only from the database manager in database mode', async () => {
			const { fsManager, databaseManager } = setup('database');

			await service.deleteMany(locations);

			expect(databaseManager.deleteMany).toHaveBeenCalledWith(locations);
			expect(fsManager.deleteMany).not.toHaveBeenCalled();
		});

		it('should call the shared filesystem manager once in filesystem mode', async () => {
			const { fsManager } = setup('filesystem-v2');

			await service.deleteMany(locations);

			expect(fsManager.deleteMany).toHaveBeenCalledTimes(1);
		});

		it('should still delete from disk when Azure fails', async () => {
			const { fsManager, azureManager } = setup('azure');
			vi.mocked(azureManager.deleteMany!).mockRejectedValue(new Error('azure down'));

			await expect(service.deleteMany(locations)).rejects.toThrow(AggregateError);

			expect(fsManager.deleteMany).toHaveBeenCalledWith(locations);
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
		});

		it('should report a non-error rejection as an Error', async () => {
			const { fsManager, azureManager } = setup('azure');
			vi.mocked(azureManager.deleteMany!).mockRejectedValue('azure down');

			await expect(service.deleteMany(locations)).rejects.toThrow(AggregateError);

			expect(fsManager.deleteMany).toHaveBeenCalledWith(locations);
			expect(errorReporter.error).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'azure down' }),
			);
		});

		it('should delete only the mode manager when no filesystem manager is registered', async () => {
			const azureManager = mock<BinaryData.Manager>();
			service.setManager('azure', azureManager);
			Object.assign(service, { mode: 'azure' });

			await service.deleteMany(locations);

			expect(azureManager.deleteMany).toHaveBeenCalledWith(locations);
		});

		it('should still delete from Azure when disk fails', async () => {
			const { fsManager, azureManager } = setup('azure');
			vi.mocked(fsManager.deleteMany!).mockRejectedValue(new Error('disk failure'));

			await expect(service.deleteMany(locations)).rejects.toThrow(AggregateError);

			expect(azureManager.deleteMany).toHaveBeenCalledWith(locations);
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
		});
	});

	describe('manager dispatch', () => {
		it('should route an azure-mode binary id to the registered azure manager', async () => {
			const fileId = 'workflows/w/executions/e/binary_data/uuid';
			const buffer = Buffer.from('blob');
			const azureManager = mock<BinaryData.Manager>();
			azureManager.getAsBuffer.mockResolvedValue(buffer);
			service.setManager('azure', azureManager);

			const result = await service.getAsBuffer(mock<IBinaryData>({ id: `azure:${fileId}` }));

			expect(result).toBe(buffer);
			expect(azureManager.getAsBuffer).toHaveBeenCalledWith(fileId);
		});
	});
});
