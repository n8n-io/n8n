import { By } from 'selenium-webdriver';

import { mapPlaywrightKeyToWebDriver, toWebDriverLocator } from '../adapters/selector-utils';

describe('toWebDriverLocator', () => {
	it('should convert css= prefix to By.css', () => {
		const result = toWebDriverLocator('css=.btn-primary');
		expect(result).toEqual(By.css('.btn-primary'));
	});

	it('should treat bare selector as CSS', () => {
		const result = toWebDriverLocator('.btn-primary');
		expect(result).toEqual(By.css('.btn-primary'));
	});

	it('should convert xpath= prefix to By.xpath', () => {
		const result = toWebDriverLocator('xpath=//div[@class="main"]');
		expect(result).toEqual(By.xpath('//div[@class="main"]'));
	});

	it('should convert text= prefix to XPath text search', () => {
		const result = toWebDriverLocator('text=Submit');
		expect(result).toEqual(By.xpath('//*[normalize-space(.)="Submit"]'));
	});

	it('should convert id= prefix to By.id', () => {
		const result = toWebDriverLocator('id=main-content');
		expect(result).toEqual(By.id('main-content'));
	});

	it('should convert role= prefix to XPath role attribute', () => {
		const result = toWebDriverLocator('role=button');
		expect(result).toEqual(By.xpath('//*[@role="button"]'));
	});

	it('should convert role= with [name="..."] to XPath role+name', () => {
		const result = toWebDriverLocator('role=button[name="Submit"]');
		expect(result).toEqual(
			By.xpath('//*[@role="button" and (normalize-space(.)="Submit" or @aria-label="Submit")]'),
		);
	});
});

describe('mapPlaywrightKeyToWebDriver', () => {
	it('should map Enter to Key.ENTER', () => {
		const result = mapPlaywrightKeyToWebDriver('Enter');
		expect(result).toHaveLength(1);
		// Key.ENTER is '\uE007'
		expect(result[0]).toBe('\uE007');
	});

	it('should map Tab to Key.TAB', () => {
		const result = mapPlaywrightKeyToWebDriver('Tab');
		expect(result[0]).toBe('\uE004');
	});

	it('should map Escape to Key.ESCAPE', () => {
		const result = mapPlaywrightKeyToWebDriver('Escape');
		expect(result[0]).toBe('\uE00C');
	});

	it('should split combo keys like Control+A', () => {
		const result = mapPlaywrightKeyToWebDriver('Control+A');
		expect(result).toHaveLength(2);
		// First element is Key.CONTROL
		expect(result[0]).toBe('\uE009');
		// Second is the literal character
		expect(result[1]).toBe('A');
	});

	it('should pass through single character keys', () => {
		const result = mapPlaywrightKeyToWebDriver('a');
		expect(result).toEqual(['a']);
	});

	it('should map arrow keys', () => {
		expect(mapPlaywrightKeyToWebDriver('ArrowUp')[0]).toBe('\uE013');
		expect(mapPlaywrightKeyToWebDriver('ArrowDown')[0]).toBe('\uE015');
		expect(mapPlaywrightKeyToWebDriver('ArrowLeft')[0]).toBe('\uE012');
		expect(mapPlaywrightKeyToWebDriver('ArrowRight')[0]).toBe('\uE014');
	});
});
