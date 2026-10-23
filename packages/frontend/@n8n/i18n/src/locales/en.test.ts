import { createI18n } from 'vue-i18n';

import en from './en.json';

function messagePaths(messages: object, prefix = ''): string[] {
	return Object.entries(messages).flatMap(([key, value]: [string, unknown]) =>
		typeof value === 'object' && value !== null
			? messagePaths(value, `${prefix}${key}.`)
			: [`${prefix}${key}`],
	);
}

describe('en.json', () => {
	it('compiles every message', () => {
		const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

		const failures = messagePaths(en).flatMap((path) => {
			try {
				i18n.global.t(path);
				return [];
			} catch (error) {
				return [`${path}: ${(error as Error).message.split('\n')[0]}`];
			}
		});

		expect(failures).toEqual([]);
	});
});
