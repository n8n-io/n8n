import { appThemeSchema } from '../app.schema';

describe('appThemeSchema', () => {
	test('accepts a partial theme', () => {
		expect(appThemeSchema.safeParse({ colors: { primary: '#ff6d5a' }, radius: 'md' }).success).toBe(
			true,
		);
	});

	test('accepts an empty theme', () => {
		expect(appThemeSchema.safeParse({}).success).toBe(true);
	});

	test.each(['72rem', '1200px'])('accepts the content width %s', (contentWidth) => {
		expect(appThemeSchema.safeParse({ contentWidth }).success).toBe(true);
	});

	test.each([
		[{ radius: 'huge' }, 'unknown radius'],
		[{ colors: { primary: 'x'.repeat(33) } }, 'color too long'],
		[{ colors: { primary: '' } }, 'empty color'],
		[{ fontFamily: 'x'.repeat(101) }, 'font family too long'],
		[{ contentWidth: '100%' }, 'content width not in px or rem'],
		[{ contentWidth: '72rem; }' }, 'content width with extra characters'],
	])('rejects %j (%s)', (theme, _reason) => {
		expect(appThemeSchema.safeParse(theme).success).toBe(false);
	});
});
