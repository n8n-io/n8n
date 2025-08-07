import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';

import { useI18n } from '@/composables/useI18n';
import { useOptions } from '@/composables/useOptions';

// Mock the useOptions composable
vi.mock('@/composables/useOptions', () => ({
	useOptions: vi.fn(),
}));

describe('useI18n', () => {
	it('should return translation function that returns value from i18n object', () => {
		const mockOptions = {
			defaultLanguage: 'en',
			i18n: {
				en: {
					hello: 'Hello',
					goodbye: 'Goodbye',
				},
			},
		};

		vi.mocked(useOptions).mockReturnValue({ options: mockOptions });

		const { t } = useI18n();

		expect(t('hello')).toBe('Hello');
		expect(t('goodbye')).toBe('Goodbye');
	});

	it('should return key when translation is not found', () => {
		const mockOptions = {
			defaultLanguage: 'en',
			i18n: {
				en: {
					hello: 'Hello',
				},
			},
		};

		vi.mocked(useOptions).mockReturnValue({ options: mockOptions });

		const { t } = useI18n();

		expect(t('nonexistent')).toBe('nonexistent');
	});

	it('should use default language when no language is specified', () => {
		const mockOptions = {
			i18n: {
				en: {
					hello: 'Hello',
				},
			},
		};

		vi.mocked(useOptions).mockReturnValue({ options: mockOptions });

		const { t } = useI18n();

		expect(t('hello')).toBe('Hello');
	});

	it('should handle ref values in translations', () => {
		const refValue = ref('Dynamic Hello');
		const mockOptions = {
			defaultLanguage: 'en',
			i18n: {
				en: {
					hello: refValue,
					static: 'Static Hello',
				},
			},
		};

		vi.mocked(useOptions).mockReturnValue({ options: mockOptions });

		const { t } = useI18n();

		expect(t('hello')).toBe('Dynamic Hello');
		expect(t('static')).toBe('Static Hello');
	});

	it('should handle missing i18n configuration', () => {
		const mockOptions = {};

		vi.mocked(useOptions).mockReturnValue({ options: mockOptions });

		const { t } = useI18n();

		expect(t('hello')).toBe('hello');
	});

	it('should handle missing language in i18n configuration', () => {
		const mockOptions = {
			defaultLanguage: 'fr',
			i18n: {
				en: {
					hello: 'Hello',
				},
			},
		};

		vi.mocked(useOptions).mockReturnValue({ options: mockOptions });

		const { t } = useI18n();

		expect(t('hello')).toBe('hello');
	});

	it('should check if translation exists with te function', () => {
		const mockOptions = {
			defaultLanguage: 'en',
			i18n: {
				en: {
					hello: 'Hello',
					empty: '',
					zero: 0,
					false: false,
				},
			},
		};

		vi.mocked(useOptions).mockReturnValue({ options: mockOptions });

		const { te } = useI18n();

		expect(te('hello')).toBe(true);
		expect(te('nonexistent')).toBe(false);
		expect(te('empty')).toBe(false); // Empty string is falsy
		expect(te('zero')).toBe(false); // 0 is falsy
		expect(te('false')).toBe(false); // false is falsy
	});

	it('should handle null options gracefully', () => {
		vi.mocked(useOptions).mockReturnValue({ options: null });

		const { t, te } = useI18n();

		expect(t('hello')).toBe('hello');
		expect(te('hello')).toBe(false);
	});

	it('should handle undefined options gracefully', () => {
		vi.mocked(useOptions).mockReturnValue({ options: undefined });

		const { t, te } = useI18n();

		expect(t('hello')).toBe('hello');
		expect(te('hello')).toBe(false);
	});

	it('should work with different languages', () => {
		const mockOptions = {
			defaultLanguage: 'es',
			i18n: {
				en: {
					hello: 'Hello',
				},
				es: {
					hello: 'Hola',
				},
			},
		};

		vi.mocked(useOptions).mockReturnValue({ options: mockOptions });

		const { t } = useI18n();

		expect(t('hello')).toBe('Hola');
	});

	it('should handle ref values that change dynamically', () => {
		const refValue = ref('Initial Value');
		const mockOptions = {
			defaultLanguage: 'en',
			i18n: {
				en: {
					dynamic: refValue,
				},
			},
		};

		vi.mocked(useOptions).mockReturnValue({ options: mockOptions });

		const { t } = useI18n();

		expect(t('dynamic')).toBe('Initial Value');

		// Change the ref value
		refValue.value = 'Updated Value';

		expect(t('dynamic')).toBe('Updated Value');
	});
});
