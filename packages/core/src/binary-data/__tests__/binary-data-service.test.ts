import { mock } from 'jest-mock-extended';
import { sign, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { IBinaryData } from 'n8n-workflow';

import type { BinaryDataConfig } from '../binary-data.config';
import { BinaryDataService } from '../binary-data.service';

const now = new Date('2025-01-01T01:23:45.678Z');
jest.useFakeTimers({ now });

describe('BinaryDataService', () => {
	const signingSecret = 'test-signing-secret';
	const config = mock<BinaryDataConfig>({ signingSecret });
	const binaryData = mock<IBinaryData>({ id: 'filesystem:id_123' });
	const validToken = sign({ id: binaryData.id }, signingSecret, { expiresIn: '1 day' });

	let service: BinaryDataService;
	beforeEach(() => {
		jest.resetAllMocks();

		config.signingSecret = signingSecret;
		service = new BinaryDataService(config);
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
});
