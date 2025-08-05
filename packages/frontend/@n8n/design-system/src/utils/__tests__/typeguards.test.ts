/**
 * Test suite for typeguards utility functions
 */

import { describe, it, expect } from 'vitest';
import { isEventBindingElementAttribute } from '../typeguards';

describe('typeguards', () => {
	describe('isEventBindingElementAttribute', () => {
		describe('Event Attribute Detection', () => {
			it('should return true for onClick attribute', () => {
				const result = isEventBindingElementAttribute(() => {}, 'onClick');
				expect(result).toBe(true);
			});

			it('should return true for onMouseover attribute', () => {
				const result = isEventBindingElementAttribute(() => {}, 'onMouseover');
				expect(result).toBe(true);
			});

			it('should return true for onKeyDown attribute', () => {
				const result = isEventBindingElementAttribute(() => {}, 'onKeyDown');
				expect(result).toBe(true);
			});

			it('should return true for onChange attribute', () => {
				const result = isEventBindingElementAttribute(() => {}, 'onChange');
				expect(result).toBe(true);
			});

			it('should return true for onSubmit attribute', () => {
				const result = isEventBindingElementAttribute(() => {}, 'onSubmit');
				expect(result).toBe(true);
			});
		});

		describe('Non-Event Attribute Detection', () => {
			it('should return false for regular attributes', () => {
				const result = isEventBindingElementAttribute('value', 'value');
				expect(result).toBe(false);
			});

			it('should return false for class attribute', () => {
				const result = isEventBindingElementAttribute('btn', 'class');
				expect(result).toBe(false);
			});

			it('should return false for id attribute', () => {
				const result = isEventBindingElementAttribute('my-id', 'id');
				expect(result).toBe(false);
			});

			it('should return false for data attributes', () => {
				const result = isEventBindingElementAttribute('test', 'data-test-id');
				expect(result).toBe(false);
			});

			it('should return false for aria attributes', () => {
				const result = isEventBindingElementAttribute('label', 'aria-label');
				expect(result).toBe(false);
			});

			it('should return false for attributes starting with lowercase on', () => {
				const result = isEventBindingElementAttribute('value', 'onlyAttr');
				expect(result).toBe(false);
			});

			it('should return false for attributes containing on but not starting with it', () => {
				const result = isEventBindingElementAttribute('value', 'buttonColor');
				expect(result).toBe(false);
			});
		});

		describe('Edge Cases', () => {
			it('should return true for single character after on', () => {
				const result = isEventBindingElementAttribute(() => {}, 'onA');
				expect(result).toBe(true);
			});

			it('should return false for just "on" without uppercase letter', () => {
				const result = isEventBindingElementAttribute(() => {}, 'on');
				expect(result).toBe(false);
			});

			it('should return false for "on" with lowercase letter', () => {
				const result = isEventBindingElementAttribute(() => {}, 'onlower');
				expect(result).toBe(false);
			});

			it('should return true for mixed case after on', () => {
				const result = isEventBindingElementAttribute(() => {}, 'onMyCustomEvent');
				expect(result).toBe(true);
			});

			it('should return true for numeric characters after on', () => {
				const result = isEventBindingElementAttribute(() => {}, 'onEvent123');
				expect(result).toBe(true);
			});

			it('should handle empty attribute name', () => {
				const result = isEventBindingElementAttribute(() => {}, '');
				expect(result).toBe(false);
			});

			it('should handle special characters in attribute name', () => {
				const result = isEventBindingElementAttribute(() => {}, 'onClick-custom');
				expect(result).toBe(true); // Still starts with onC
			});
		});

		describe('Attribute Value Types', () => {
			it('should work regardless of attribute value type with functions', () => {
				const handler = () => console.log('clicked');
				const result = isEventBindingElementAttribute(handler, 'onClick');
				expect(result).toBe(true);
			});

			it('should work regardless of attribute value type with strings', () => {
				const result = isEventBindingElementAttribute('not a function', 'onClick');
				expect(result).toBe(true);
			});

			it('should work regardless of attribute value type with numbers', () => {
				const result = isEventBindingElementAttribute(123, 'onClick');
				expect(result).toBe(true);
			});

			it('should work regardless of attribute value type with null', () => {
				const result = isEventBindingElementAttribute(null, 'onClick');
				expect(result).toBe(true);
			});

			it('should work regardless of attribute value type with undefined', () => {
				const result = isEventBindingElementAttribute(undefined, 'onClick');
				expect(result).toBe(true);
			});

			it('should work regardless of attribute value type with objects', () => {
				const result = isEventBindingElementAttribute({ key: 'value' }, 'onClick');
				expect(result).toBe(true);
			});

			it('should work regardless of attribute value type with arrays', () => {
				const result = isEventBindingElementAttribute(['item1', 'item2'], 'onClick');
				expect(result).toBe(true);
			});
		});

		describe('Common Event Attributes', () => {
			const commonEventAttributes = [
				'onClick',
				'onDoubleClick',
				'onMouseDown',
				'onMouseUp',
				'onMouseMove',
				'onMouseEnter',
				'onMouseLeave',
				'onKeyDown',
				'onKeyUp',
				'onKeyPress',
				'onFocus',
				'onBlur',
				'onChange',
				'onInput',
				'onSubmit',
				'onReset',
				'onScroll',
				'onResize',
				'onLoad',
				'onError',
			];

			it('should correctly identify all common event attributes', () => {
				commonEventAttributes.forEach((attr) => {
					const result = isEventBindingElementAttribute(() => {}, attr);
					expect(result).toBe(true);
				});
			});
		});

		describe('Common Non-Event Attributes', () => {
			const commonNonEventAttributes = [
				'id',
				'class',
				'style',
				'title',
				'alt',
				'src',
				'href',
				'value',
				'placeholder',
				'disabled',
				'readonly',
				'type',
				'name',
				'data-test-id',
				'aria-label',
				'aria-describedby',
				'role',
				'tabindex',
			];

			it('should correctly reject all common non-event attributes', () => {
				commonNonEventAttributes.forEach((attr) => {
					const result = isEventBindingElementAttribute('value', attr);
					expect(result).toBe(false);
				});
			});
		});
	});
});
