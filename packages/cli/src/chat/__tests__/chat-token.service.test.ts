import { mock } from 'jest-mock-extended';

import type { JwtService } from '@/services/jwt.service';

import { ChatTokenService } from '../chat-token.service';

describe('ChatTokenService', () => {
	let chatTokenService: ChatTokenService;
	let jwtService: jest.Mocked<JwtService>;

	beforeEach(() => {
		jwtService = mock<JwtService>();
		chatTokenService = new ChatTokenService(jwtService);
	});

	describe('generateToken', () => {
		it('should call jwtService.sign with correct payload', () => {
			const executionId = 'test-execution-123';
			jwtService.sign.mockReturnValue('signed-jwt-token');

			const token = chatTokenService.generateToken(executionId);

			expect(token).toBe('signed-jwt-token');
			expect(jwtService.sign).toHaveBeenCalledWith(
				{ executionId, type: 'chat' },
				{ expiresIn: '5m' },
			);
		});

		it('should generate different tokens for different executions', () => {
			jwtService.sign.mockReturnValueOnce('token-1').mockReturnValueOnce('token-2');

			const token1 = chatTokenService.generateToken('execution-1');
			const token2 = chatTokenService.generateToken('execution-2');

			expect(token1).not.toBe(token2);
			expect(jwtService.sign).toHaveBeenCalledTimes(2);
		});
	});

	describe('validateToken', () => {
		it('should return true for a valid token with matching executionId', () => {
			const executionId = 'test-execution';
			jwtService.verify.mockReturnValue({ executionId, type: 'chat' });

			expect(chatTokenService.validateToken(executionId, 'valid-token')).toBe(true);
			expect(jwtService.verify).toHaveBeenCalledWith('valid-token', { algorithms: ['HS256'] });
		});

		it('should return false when token verification throws', () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('Invalid token');
			});

			expect(chatTokenService.validateToken('test-execution', 'invalid-token')).toBe(false);
		});

		it('should return false for wrong executionId', () => {
			jwtService.verify.mockReturnValue({ executionId: 'different-execution', type: 'chat' });

			expect(chatTokenService.validateToken('test-execution', 'valid-token')).toBe(false);
		});

		it('should return false for wrong token type', () => {
			jwtService.verify.mockReturnValue({ executionId: 'test-execution', type: 'other' });

			expect(chatTokenService.validateToken('test-execution', 'valid-token')).toBe(false);
		});

		it('should return false for missing type', () => {
			jwtService.verify.mockReturnValue({ executionId: 'test-execution' });

			expect(chatTokenService.validateToken('test-execution', 'valid-token')).toBe(false);
		});

		it('should return false for expired token', () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('jwt expired');
			});

			expect(chatTokenService.validateToken('test-execution', 'expired-token')).toBe(false);
		});
	});
});
