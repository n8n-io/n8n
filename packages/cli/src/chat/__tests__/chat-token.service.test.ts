import { ChatTokenService } from '../chat-token.service';

describe('ChatTokenService', () => {
	let chatTokenService: ChatTokenService;

	beforeEach(() => {
		chatTokenService = new ChatTokenService();
	});

	describe('generateToken', () => {
		it('should generate a 64-character hex token', () => {
			const executionId = 'test-execution-123';
			const token = chatTokenService.generateToken(executionId);

			expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
			expect(token).toMatch(/^[a-f0-9]+$/); // Only hex characters
		});

		it('should generate unique tokens for different executions', () => {
			const token1 = chatTokenService.generateToken('execution-1');
			const token2 = chatTokenService.generateToken('execution-2');

			expect(token1).not.toBe(token2);
		});

		it('should overwrite token if called twice for the same executionId', () => {
			const executionId = 'test-execution';
			const token1 = chatTokenService.generateToken(executionId);
			const token2 = chatTokenService.generateToken(executionId);

			expect(token1).not.toBe(token2);
			// Only the second token should be valid
			expect(chatTokenService.validateToken(executionId, token1)).toBe(false);
			expect(chatTokenService.validateToken(executionId, token2)).toBe(true);
		});
	});

	describe('validateToken', () => {
		it('should return true for a valid token', () => {
			const executionId = 'test-execution';
			const token = chatTokenService.generateToken(executionId);

			expect(chatTokenService.validateToken(executionId, token)).toBe(true);
		});

		it('should return false for an invalid token', () => {
			const executionId = 'test-execution';
			chatTokenService.generateToken(executionId);

			expect(chatTokenService.validateToken(executionId, 'invalid-token')).toBe(false);
		});

		it('should return false for a non-existent executionId', () => {
			expect(chatTokenService.validateToken('non-existent', 'any-token')).toBe(false);
		});

		it('should return false for wrong executionId with valid token', () => {
			const executionId = 'test-execution';
			const token = chatTokenService.generateToken(executionId);

			expect(chatTokenService.validateToken('wrong-execution', token)).toBe(false);
		});

		it('should return false for empty token', () => {
			const executionId = 'test-execution';
			chatTokenService.generateToken(executionId);

			expect(chatTokenService.validateToken(executionId, '')).toBe(false);
		});

		it('should be resistant to timing attacks (uses timing-safe comparison)', () => {
			const executionId = 'test-execution';
			const token = chatTokenService.generateToken(executionId);

			// The implementation uses timingSafeEqual, but we can't easily test timing
			// We just verify that similar tokens don't pass
			const almostCorrectToken = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');
			expect(chatTokenService.validateToken(executionId, almostCorrectToken)).toBe(false);
		});
	});

	describe('removeToken', () => {
		it('should remove the token for an execution', () => {
			const executionId = 'test-execution';
			const token = chatTokenService.generateToken(executionId);

			expect(chatTokenService.validateToken(executionId, token)).toBe(true);

			chatTokenService.removeToken(executionId);

			expect(chatTokenService.validateToken(executionId, token)).toBe(false);
		});

		it('should not throw when removing non-existent token', () => {
			expect(() => chatTokenService.removeToken('non-existent')).not.toThrow();
		});
	});
});
