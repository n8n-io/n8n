import { describe, it, expect, vi } from 'vitest';
import { inject } from 'vue';
import { useChat } from '@/composables/useChat';
import { ChatSymbol } from '@/constants';

// Mock the inject function
vi.mock('vue', async () => {
	const actual = await vi.importActual('vue');
	return {
		...actual,
		inject: vi.fn(),
	};
});

describe('useChat', () => {
	it('should return injected chat instance', () => {
		const mockChat = {
			messages: [],
			isStreaming: false,
			sendMessage: vi.fn(),
			loadPreviousSession: vi.fn(),
			startNewSession: vi.fn(),
		};

		vi.mocked(inject).mockReturnValue(mockChat);

		const result = useChat();

		expect(inject).toHaveBeenCalledWith(ChatSymbol);
		expect(result).toBe(mockChat);
	});

	it('should handle undefined injection gracefully', () => {
		vi.mocked(inject).mockReturnValue(undefined);

		const result = useChat();

		expect(inject).toHaveBeenCalledWith(ChatSymbol);
		expect(result).toBeUndefined();
	});

	it('should return the exact chat object without modification', () => {
		const mockChat = {
			messages: [{ id: '1', text: 'Hello', sender: 'user' }],
			isStreaming: true,
			sendMessage: vi.fn(),
			loadPreviousSession: vi.fn(),
			startNewSession: vi.fn(),
			customProperty: 'test',
		};

		vi.mocked(inject).mockReturnValue(mockChat);

		const result = useChat();

		expect(result).toEqual(mockChat);
		expect(result.customProperty).toBe('test');
	});
});
