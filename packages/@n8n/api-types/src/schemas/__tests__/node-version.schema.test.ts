import { nodeVersionSchema } from '../node-version.schema';

describe('nodeVersionSchema', () => {
	describe('valid versions', () => {
		test.each([
			[1, 'single digit'],
			[2, 'single digit'],
			[1.0, 'major.minor with zero minor'],
			[1.2, 'major.minor'],
			[10.5, 'major.minor with double digits'],
		])('should accept %s as a valid version (%s)', (version) => {
			const validated = nodeVersionSchema.parse(version);
			expect(validated).toBe(version);
		});
	});

	describe('invalid versions', () => {
		test.each([
			['not-a-number', 'non-number input'],
			['1.2.3', 'more than two parts'],
			['1.a', 'non-numeric characters'],
			['1.2.3', 'more than two parts as string'],
		])('should reject %s as an invalid version (%s)', (version) => {
			const check = () => nodeVersionSchema.parse(version);
			expect(check).toThrowError();
		});
	});
});
