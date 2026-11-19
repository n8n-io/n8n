import { OVERRIDES_STORAGE_KEY, useFeatureFlags } from './useFeatureFlags';

describe('useFeatureFlags', () => {
	afterEach(() => {
		window.localStorage.removeItem(OVERRIDES_STORAGE_KEY);
	});

	it('ignores null override values when refreshing flags', () => {
		window.localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify({ test: null }));
		const { flags, refresh } = useFeatureFlags();

		expect(refresh).not.toThrow();
		expect(flags.value).toContainEqual({
			name: 'test',
			phValue: undefined,
			override: undefined,
			isVariant: false,
		});
	});
});
