import { defineConfig, globalIgnores } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(globalIgnores(['dist/**']), nodeConfig, {
	rules: {
		'@typescript-eslint/naming-convention': [
			'error',
			// Default: require camelCase for most things
			{
				selector: 'default',
				format: ['camelCase'],
				leadingUnderscore: 'allow',
			},
			// Variables can be camelCase or UPPER_CASE (constants) or PascalCase (classes)
			{
				selector: 'variable',
				format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
				leadingUnderscore: 'allow',
			},
			// Functions can be camelCase or PascalCase (decorator factories)
			{
				selector: 'function',
				format: ['camelCase', 'PascalCase'],
			},
			// Parameters can be camelCase or PascalCase (for class constructors)
			{
				selector: 'parameter',
				format: ['camelCase', 'PascalCase'],
				leadingUnderscore: 'allow',
			},
			// Imports can be PascalCase (modules, classes) or camelCase
			{
				selector: 'import',
				format: ['camelCase', 'PascalCase'],
			},
			// Types, classes, interfaces, enums should be PascalCase
			{
				selector: 'typeLike',
				format: ['PascalCase'],
			},
			// Type properties can be any format (API responses, schema definitions)
			{
				selector: 'typeProperty',
				format: null,
			},
			// Object literal properties can be any format (node names, AST types, API responses)
			{
				selector: 'objectLiteralProperty',
				format: null,
			},
			// Class properties can be camelCase or UPPER_CASE, with leading underscores for private/internal
			{
				selector: 'classProperty',
				format: ['camelCase', 'UPPER_CASE'],
				leadingUnderscore: 'allowSingleOrDouble',
			},
			// Enum members should be UPPER_CASE or PascalCase
			{
				selector: 'enumMember',
				format: ['UPPER_CASE', 'PascalCase'],
			},
		],
		// Disable this rule - it conflicts with legitimate use of literal ${} in strings
		'n8n-local-rules/no-interpolation-in-regular-string': 'off',
		// These identifiers are used as object keys for type mappings
		'id-denylist': 'off',
		// Strict type safety rules - no `any` allowed
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/no-unsafe-assignment': 'error',
		'@typescript-eslint/no-unsafe-call': 'error',
		'@typescript-eslint/no-unsafe-member-access': 'error',
		'@typescript-eslint/no-unsafe-return': 'error',
		'@typescript-eslint/no-unsafe-argument': 'error',
	},
});
