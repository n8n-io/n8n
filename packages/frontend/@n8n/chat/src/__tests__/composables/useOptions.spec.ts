import { describe, it, expect, vi } from 'vitest';
import { inject } from 'vue';
import { useOptions } from '@/composables/useOptions';
import { ChatOptionsSymbol } from '@/constants';

// Mock the inject function
vi.mock('vue', async () => {
	const actual = await vi.importActual('vue');
	return {
		...actual,
		inject: vi.fn(),
	};
});

describe('useOptions', () => {
	it('should return injected options', () => {
		const mockOptions = {
			webhookUrl: 'https://example.com/webhook',
			defaultLanguage: 'en',
			i18n: {
				en: {
					hello: 'Hello',
				},
			},
			theme: 'light',
		};

		vi.mocked(inject).mockReturnValue(mockOptions);

		const { options } = useOptions();

		expect(inject).toHaveBeenCalledWith(ChatOptionsSymbol);
		expect(options).toBe(mockOptions);
	});

	it('should handle undefined injection', () => {
		vi.mocked(inject).mockReturnValue(undefined);

		const { options } = useOptions();

		expect(inject).toHaveBeenCalledWith(ChatOptionsSymbol);
		expect(options).toBeUndefined();
	});

	it('should return the exact options object without modification', () => {
		const mockOptions = {
			webhookUrl: 'https://example.com/webhook',
			customProperty: { nested: 'value' },
			arrayProperty: [1, 2, 3],
		};

		vi.mocked(inject).mockReturnValue(mockOptions);

		const { options } = useOptions();

		expect(options).toEqual(mockOptions);
		expect(options.customProperty).toBe(mockOptions.customProperty);
		expect(options.arrayProperty).toBe(mockOptions.arrayProperty);
	});

	it('should handle null options', () => {
		vi.mocked(inject).mockReturnValue(null);

		const { options } = useOptions();

		expect(options).toBeNull();
	});

	it('should handle empty options object', () => {
		const mockOptions = {};

		vi.mocked(inject).mockReturnValue(mockOptions);

		const { options } = useOptions();

		expect(options).toEqual({});
	});

	it('should work with complex options structure', () => {
		const mockOptions = {
			webhookUrl: 'https://api.example.com/chat',
			webhookConfig: {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			},
			defaultLanguage: 'fr',
			i18n: {
				en: {
					greeting: 'Hello',
					farewell: 'Goodbye',
				},
				fr: {
					greeting: 'Bonjour',
					farewell: 'Au revoir',
				},
			},
			theme: {
				mode: 'dark',
				colors: {
					primary: '#007bff',
					secondary: '#6c757d',
				},
			},
			showWelcomeScreen: true,
			allowFileUploads: false,
			maxMessageLength: 1000,
		};

		vi.mocked(inject).mockReturnValue(mockOptions);

		const { options } = useOptions();

		expect(options).toEqual(mockOptions);
		expect(options.webhookConfig.method).toBe('POST');
		expect(options.i18n.fr.greeting).toBe('Bonjour');
		expect(options.theme.colors.primary).toBe('#007bff');
	});
});
