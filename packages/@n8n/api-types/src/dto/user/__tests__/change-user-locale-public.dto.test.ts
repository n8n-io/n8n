import { ChangeUserLocalePublicDto } from '../change-user-locale-public.dto';

describe('ChangeUserLocalePublicDto', () => {
	test.each([
		{ name: 'a locale code', request: { locale: 'de' } },
		{ name: 'null, to clear the locale', request: { locale: null } },
	])('accepts $name', ({ request }) => {
		expect(ChangeUserLocalePublicDto.safeParse(request).success).toBe(true);
	});

	test.each([
		{ name: 'an empty body', request: {} },
		{ name: 'an empty string', request: { locale: '' } },
		{ name: 'a number', request: { locale: 1 } },
	])('rejects $name', ({ request }) => {
		expect(ChangeUserLocalePublicDto.safeParse(request).success).toBe(false);
	});
});
