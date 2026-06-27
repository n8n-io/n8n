import { describe, it, expect } from 'vitest';
import i18nHmrSource from './i18nHmr.ts?raw';

/**
 * Tests for i18nHmr production locale loading.
 *
 * Bug: import.meta.glob inside if(hot) only works in dev mode.
 * Rolldown (production bundler) does not transform import.meta.glob,
 * so locales added per i18n docs won't load in production builds.
 *
 * Fix: Static imports outside if(hot) block ensure locales are bundled.
 */
describe('i18nHmr production locale loading', () => {
	it('should have static locale imports outside if(hot) block', () => {
		const ifHotMatch = i18nHmrSource.match(/if\s*\(\s*hot\s*\)/);
		expect(ifHotMatch).toBeDefined();

		const ifHotPosition = ifHotMatch!.index!;
		const beforeIfHot = i18nHmrSource.slice(0, ifHotPosition);

		// Both checks must verify the pre-if(hot) section to ensure production builds work
		const hasStaticLocaleImport =
			/import\s+\w+\s+from\s+['"]@n8n\/i18n\/locales\/\w+\.json['"]/.test(beforeIfHot);
		const hasUpdateCallBeforeIfHot = /updateLocaleMessages\s*\(/.test(beforeIfHot);

		expect(hasStaticLocaleImport).toBe(true);
		expect(hasUpdateCallBeforeIfHot).toBe(true);
	});
});
