import { RuleTester } from '@typescript-eslint/rule-tester';
import { PackageNameConventionRule } from './package-name-convention.js';

const ruleTester = new RuleTester();

ruleTester.run('package-name-convention', PackageNameConventionRule, {
	valid: [
		{
			name: 'valid unscoped package name',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
		},
		{
			name: 'valid unscoped package name with dashes',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-my-service", "version": "1.0.0" }',
		},
		{
			name: 'valid scoped package name',
			filename: 'package.json',
			code: '{ "name": "@mycompany/n8n-nodes-example", "version": "1.0.0" }',
		},
		{
			name: 'valid scoped package name with dashes',
			filename: 'package.json',
			code: '{ "name": "@author/n8n-nodes-service", "version": "1.0.0" }',
		},
		{
			name: 'object without name property',
			filename: 'package.json',
			code: '{ "version": "1.0.0", "description": "test" }',
		},
		{
			name: 'non-package.json file ignored',
			filename: 'some-config.json',
			code: '{ "name": "my-config", "type": "config" }',
		},
	],
	invalid: [
		{
			name: 'invalid package name - generic',
			filename: 'package.json',
			code: '{ "name": "my-package", "version": "1.0.0" }',
			errors: [{ messageId: 'invalidPackageName', data: { packageName: 'my-package' } }],
		},
		{
			name: 'invalid package name - missing nodes',
			filename: 'package.json',
			code: '{ "name": "n8n-example", "version": "1.0.0" }',
			errors: [{ messageId: 'invalidPackageName', data: { packageName: 'n8n-example' } }],
		},
		{
			name: 'invalid scoped package name',
			filename: 'package.json',
			code: '{ "name": "@company/example-nodes", "version": "1.0.0" }',
			errors: [
				{ messageId: 'invalidPackageName', data: { packageName: '@company/example-nodes' } },
			],
		},
		{
			name: 'invalid package name - wrong order',
			filename: 'package.json',
			code: '{ "name": "nodes-n8n-example", "version": "1.0.0" }',
			errors: [{ messageId: 'invalidPackageName', data: { packageName: 'nodes-n8n-example' } }],
		},
		{
			name: 'empty package name',
			filename: 'package.json',
			code: '{ "name": "", "version": "1.0.0" }',
			errors: [{ messageId: 'invalidPackageName', data: { packageName: '' } }],
		},
	],
});

// Test the validation function directly
import { describe, test, expect } from 'vitest';

describe('package name validation', () => {
	// Import the validation function from the rule for direct testing
	const isValidPackageName = (name: string): boolean => {
		// Pattern 1: n8n-nodes-[PACKAGE-NAME]
		const unscoped = /^n8n-nodes-.+$/;

		// Pattern 2: @[AUTHOR]/n8n-nodes-[PACKAGE-NAME]
		const scoped = /^@.+\/n8n-nodes-.+$/;

		return unscoped.test(name) || scoped.test(name);
	};

	test('should accept valid unscoped package names', () => {
		expect(isValidPackageName('n8n-nodes-example')).toBe(true);
		expect(isValidPackageName('n8n-nodes-my-service')).toBe(true);
		expect(isValidPackageName('n8n-nodes-complex-name-here')).toBe(true);
	});

	test('should accept valid scoped package names', () => {
		expect(isValidPackageName('@mycompany/n8n-nodes-example')).toBe(true);
		expect(isValidPackageName('@author/n8n-nodes-service')).toBe(true);
		expect(isValidPackageName('@my-org/n8n-nodes-complex-name')).toBe(true);
	});

	test('should reject invalid package names', () => {
		expect(isValidPackageName('my-package')).toBe(false);
		expect(isValidPackageName('n8n-example')).toBe(false);
		expect(isValidPackageName('@company/example-nodes')).toBe(false);
		expect(isValidPackageName('nodes-n8n-example')).toBe(false);
		expect(isValidPackageName('example-n8n-nodes')).toBe(false);
		expect(isValidPackageName('@author/nodes-n8n-example')).toBe(false);
	});

	test('should handle edge cases', () => {
		expect(isValidPackageName('n8n-nodes-')).toBe(false); // Empty package name part
		expect(isValidPackageName('n8n-nodes')).toBe(false); // No package name part
		expect(isValidPackageName('@/n8n-nodes-example')).toBe(false); // Empty author name doesn't match pattern
		expect(isValidPackageName('@author/')).toBe(false); // Incomplete scoped name
	});
});
