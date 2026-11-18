import { getBrandIconStyle, isBrandIcon, withBrandIconStyle } from './brandIcons';

describe('brandIcons', () => {
	it('tells brand icons from the other icons', () => {
		expect(isBrandIcon('brand:home')).toBe(true);
		expect(isBrandIcon('home')).toBe(false);
		expect(isBrandIcon(undefined)).toBe(false);
	});

	it('reads and changes the style of a brand icon', () => {
		expect(getBrandIconStyle('brand:home')).toBe('outline');
		expect(getBrandIconStyle('brand:home:filled')).toBe('filled');
		expect(withBrandIconStyle('brand:home', 'filled')).toBe('brand:home:filled');
		expect(withBrandIconStyle('brand:home:filled', 'outline')).toBe('brand:home');
		expect(withBrandIconStyle('brand:home:filled', 'filled')).toBe('brand:home:filled');
	});
});
