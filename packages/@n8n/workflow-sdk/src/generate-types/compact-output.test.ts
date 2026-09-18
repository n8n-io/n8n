import { describe, it, expect } from 'vitest';

import {
	describeProperty,
	registerHoistCandidate,
	sanitizeDocText,
	withHoistedTypeLiterals,
} from './compact-output';

describe('compact-output', () => {
	describe('sanitizeDocText', () => {
		it('escapes JSDoc closing delimiters and angle brackets', () => {
			expect(sanitizeDocText('Close */ here <test>')).toBe('Close *\\/ here &lt;test&gt;');
		});

		it('returns empty string for empty input', () => {
			expect(sanitizeDocText('')).toBe('');
		});
	});

	describe('describeProperty', () => {
		it('extracts and sanitizes description', () => {
			expect(describeProperty({ description: 'My prop description */' })).toBe(
				'My prop description *\\/',
			);
		});

		it('falls back to displayName if description is missing', () => {
			expect(describeProperty({ displayName: 'My Name' })).toBe('My Name');
		});

		it('returns undefined if both are missing or empty', () => {
			expect(describeProperty({})).toBeUndefined();
			expect(describeProperty({ description: '   ' })).toBeUndefined();
		});
	});

	describe('withHoistedTypeLiterals', () => {
		it('hoists repeated type literals into a single exported type definition', () => {
			const repeatedLiteral = `{\n  id?: string;\n  name?: string;\n  value?: number;\n}`;

			const result = withHoistedTypeLiterals(() => {
				registerHoistCandidate(repeatedLiteral, 'ItemConfig');
				registerHoistCandidate(repeatedLiteral, 'ItemConfig');

				return `/**
 * Header info
 */

export interface MainConfig {
  firstItem?: ${repeatedLiteral};
  secondItem?: ${repeatedLiteral};
}`;
			});

			// Should have hoisted type declaration
			expect(result).toContain(
				'export type ItemConfig = {\n  id?: string;\n  name?: string;\n  value?: number;\n};',
			);

			// Should have replaced inline literals with the hoisted type name
			expect(result).toContain('firstItem?: ItemConfig;');
			expect(result).toContain('secondItem?: ItemConfig;');
			expect(result).not.toContain(`firstItem?: ${repeatedLiteral}`);
		});

		it('does not hoist single-occurrence literals', () => {
			const singleLiteral = `{\n  uniqueField?: string;\n  anotherField?: number;\n}`;

			const result = withHoistedTypeLiterals(() => {
				registerHoistCandidate(singleLiteral, 'UniqueConfig');

				return `export interface MainConfig {
  item?: ${singleLiteral};
}`;
			});

			expect(result).not.toContain('export type UniqueConfig');
			expect(result).toContain(`item?: ${singleLiteral}`);
		});

		it('handles name collisions gracefully by adding numerical suffixes', () => {
			const literalA = `{\n  fieldA?: string;\n  fieldCommon?: number;\n}`;
			const literalB = `{\n  fieldB?: string;\n  fieldCommon?: number;\n}`;

			const result = withHoistedTypeLiterals(() => {
				registerHoistCandidate(literalA, 'ItemConfig');
				registerHoistCandidate(literalA, 'ItemConfig');
				registerHoistCandidate(literalB, 'ItemConfig');
				registerHoistCandidate(literalB, 'ItemConfig');

				return `export interface MainConfig {
  a1?: ${literalA};
  a2?: ${literalA};
  b1?: ${literalB};
  b2?: ${literalB};
}`;
			});

			expect(result).toContain('export type ItemConfig =');
			expect(result).toContain('export type ItemConfig2 =');
		});
	});
});
