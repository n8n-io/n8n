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
	const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

	afterAll(() => i18n.dispose());

	// Keep the test timeout independent of the number of messages in the catalogue.
	it.each(messagePaths(en))('compiles message "%s"', (path) => {
		expect(() => i18n.global.t(path)).not.toThrow();
	});
});
