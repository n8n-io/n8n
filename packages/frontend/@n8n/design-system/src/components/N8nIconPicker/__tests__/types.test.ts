/**
 * Test suite for N8nIconPicker type utilities
 */

import { describe, it, expect } from 'vitest';
import { isIconOrEmoji, type IconOrEmoji } from '../types';

describe('N8nIconPicker types', () => {
	describe('isIconOrEmoji', () => {
		describe('Valid IconOrEmoji Objects', () => {
			it('should return true for valid icon object', () => {
				const iconObject: IconOrEmoji = {
					type: 'icon',
					value: 'user',
				};

				const result = isIconOrEmoji(iconObject);
				expect(result).toBe(true);
			});

			it('should return true for valid emoji object', () => {
				const emojiObject: IconOrEmoji = {
					type: 'emoji',
					value: '😀',
				};

				const result = isIconOrEmoji(emojiObject);
				expect(result).toBe(true);
			});

			it('should return true for icon with complex icon name', () => {
				const iconObject = {
					type: 'icon',
					value: 'arrow-left-right',
				};

				const result = isIconOrEmoji(iconObject);
				expect(result).toBe(true);
			});

			it('should return true for emoji with unicode characters', () => {
				const emojiObject = {
					type: 'emoji',
					value: '🎉🎊✨',
				};

				const result = isIconOrEmoji(emojiObject);
				expect(result).toBe(true);
			});

			it('should return true for emoji with single character', () => {
				const emojiObject = {
					type: 'emoji',
					value: '👍',
				};

				const result = isIconOrEmoji(emojiObject);
				expect(result).toBe(true);
			});
		});

		describe('Invalid Objects', () => {
			it('should return false for null', () => {
				const result = isIconOrEmoji(null);
				expect(result).toBe(false);
			});

			it('should return false for undefined', () => {
				const result = isIconOrEmoji(undefined);
				expect(result).toBe(false);
			});

			it('should return false for primitive strings', () => {
				const result = isIconOrEmoji('icon');
				expect(result).toBe(false);
			});

			it('should return false for primitive numbers', () => {
				const result = isIconOrEmoji(123);
				expect(result).toBe(false);
			});

			it('should return false for primitive booleans', () => {
				const result = isIconOrEmoji(true);
				expect(result).toBe(false);
			});

			it('should return false for arrays', () => {
				const result = isIconOrEmoji(['icon', 'user']);
				expect(result).toBe(false);
			});

			it('should return false for empty objects', () => {
				const result = isIconOrEmoji({});
				expect(result).toBe(false);
			});
		});

		describe('Invalid Type Values', () => {
			it('should return false for invalid type property', () => {
				const invalidObject = {
					type: 'invalid',
					value: 'user',
				};

				const result = isIconOrEmoji(invalidObject);
				expect(result).toBe(false);
			});

			it('should return false for numeric type property', () => {
				const invalidObject = {
					type: 123,
					value: 'user',
				};

				const result = isIconOrEmoji(invalidObject);
				expect(result).toBe(false);
			});

			it('should return false for missing type property', () => {
				const invalidObject = {
					value: 'user',
				};

				const result = isIconOrEmoji(invalidObject);
				expect(result).toBe(false);
			});

			it('should return false for null type property', () => {
				const invalidObject = {
					type: null,
					value: 'user',
				};

				const result = isIconOrEmoji(invalidObject);
				expect(result).toBe(false);
			});
		});

		describe('Invalid Value Properties', () => {
			it('should return false for missing value property', () => {
				const invalidObject = {
					type: 'icon',
				};

				const result = isIconOrEmoji(invalidObject);
				expect(result).toBe(false);
			});

			it('should return false for numeric value property', () => {
				const invalidObject = {
					type: 'icon',
					value: 123,
				};

				const result = isIconOrEmoji(invalidObject);
				expect(result).toBe(false);
			});

			it('should return false for null value property', () => {
				const invalidObject = {
					type: 'icon',
					value: null,
				};

				const result = isIconOrEmoji(invalidObject);
				expect(result).toBe(false);
			});

			it('should return true for empty string value', () => {
				const validObject = {
					type: 'icon',
					value: '',
				};

				const result = isIconOrEmoji(validObject);
				expect(result).toBe(true); // Empty string is still a string
			});

			it('should return false for boolean value property', () => {
				const invalidObject = {
					type: 'emoji',
					value: false,
				};

				const result = isIconOrEmoji(invalidObject);
				expect(result).toBe(false);
			});

			it('should return false for object value property', () => {
				const invalidObject = {
					type: 'icon',
					value: { nested: 'object' },
				};

				const result = isIconOrEmoji(invalidObject);
				expect(result).toBe(false);
			});

			it('should return false for array value property', () => {
				const invalidObject = {
					type: 'emoji',
					value: ['😀', '😁'],
				};

				const result = isIconOrEmoji(invalidObject);
				expect(result).toBe(false);
			});
		});

		describe('Edge Cases', () => {
			it('should handle objects with extra properties', () => {
				const objectWithExtra = {
					type: 'icon',
					value: 'user',
					extra: 'property',
					another: 123,
				};

				const result = isIconOrEmoji(objectWithExtra);
				expect(result).toBe(true);
			});

			it('should handle case sensitivity for type', () => {
				const upperCaseType = {
					type: 'ICON',
					value: 'user',
				};

				const result = isIconOrEmoji(upperCaseType);
				expect(result).toBe(false);
			});

			it('should handle mixed case for type', () => {
				const mixedCaseType = {
					type: 'Icon',
					value: 'user',
				};

				const result = isIconOrEmoji(mixedCaseType);
				expect(result).toBe(false);
			});

			it('should handle whitespace in value', () => {
				const objectWithWhitespace = {
					type: 'emoji',
					value: ' 😀 ',
				};

				const result = isIconOrEmoji(objectWithWhitespace);
				expect(result).toBe(true);
			});

			it('should handle very long value strings', () => {
				const objectWithLongValue = {
					type: 'icon',
					value: 'a'.repeat(1000),
				};

				const result = isIconOrEmoji(objectWithLongValue);
				expect(result).toBe(true);
			});

			it('should handle deeply nested objects', () => {
				const nestedObject = {
					type: 'icon',
					value: 'user',
					nested: {
						deep: {
							object: true,
						},
					},
				};

				const result = isIconOrEmoji(nestedObject);
				expect(result).toBe(true);
			});
		});

		describe('Performance and Reliability', () => {
			it('should handle circular references safely', () => {
				const circularObject: any = {
					type: 'icon',
					value: 'user',
				};
				circularObject.self = circularObject;

				const result = isIconOrEmoji(circularObject);
				expect(result).toBe(true);
			});

			it('should handle prototype pollution attempts', () => {
				const maliciousObject = {
					type: 'icon',
					value: 'user',
					__proto__: { polluted: true },
				};

				const result = isIconOrEmoji(maliciousObject);
				expect(result).toBe(true);
			});

			it('should handle many repeated calls efficiently', () => {
				const validObject = {
					type: 'icon',
					value: 'user',
				};

				for (let i = 0; i < 1000; i++) {
					const result = isIconOrEmoji(validObject);
					expect(result).toBe(true);
				}
			});
		});
	});
});
