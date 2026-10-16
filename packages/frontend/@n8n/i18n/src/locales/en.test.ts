import { createI18n } from 'vue-i18n';

import en from './en.json';

describe('en.json', () => {
	it('compiles every message', () => {
		const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

		const failures = Object.keys(en).flatMap((key) => {
			try {
				i18n.global.t(key);
				return [];
			} catch (error) {
				return [`${key}: ${(error as Error).message.split('\n')[0]}`];
			}
		});

		expect(failures).toEqual([]);
	});
});
