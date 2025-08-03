import { describe, it, expect } from 'vitest';

import { constructChatWebsocketUrl } from '@/utils/utils';

describe('utils', () => {
	describe('constructChatWebsocketUrl', () => {
		it('should construct websocket URL for HTTP base URL', () => {
			const result = constructChatWebsocketUrl(
				'http://localhost:5678',
				'execution123',
				'session456',
				false,
			);
			expect(result).toBe('ws://localhost:5678/chat?sessionId=session456&executionId=execution123');
		});

		it('should construct websocket URL for HTTPS base URL', () => {
			const result = constructChatWebsocketUrl(
				'https://example.com/webhook',
				'execution123',
				'session456',
				false,
			);
			expect(result).toBe('wss://example.com/chat?sessionId=session456&executionId=execution123');
		});

		it('should include isPublic parameter when isPublic is true', () => {
			const result = constructChatWebsocketUrl(
				'https://example.com',
				'execution123',
				'session456',
				true,
			);
			expect(result).toBe(
				'wss://example.com/chat?sessionId=session456&executionId=execution123&isPublic=true',
			);
		});

		it('should handle URLs with paths correctly', () => {
			const result = constructChatWebsocketUrl(
				'https://example.com/some/path/webhook',
				'execution123',
				'session456',
				false,
			);
			expect(result).toBe('wss://example.com/chat?sessionId=session456&executionId=execution123');
		});

		it('should handle URLs with ports correctly', () => {
			const result = constructChatWebsocketUrl(
				'http://localhost:3000/webhook',
				'execution123',
				'session456',
				true,
			);
			expect(result).toBe(
				'ws://localhost:3000/chat?sessionId=session456&executionId=execution123&isPublic=true',
			);
		});
	});
});
