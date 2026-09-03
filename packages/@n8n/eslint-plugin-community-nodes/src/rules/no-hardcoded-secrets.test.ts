import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoHardcodedSecretsRule } from './no-hardcoded-secrets.js';

const ruleTester = new RuleTester();

// A 40-char hex string (SHA-1 shaped) — a realistic hardcoded secret value.
const HEX_SECRET = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
// A base64/token-shaped value with mixed case, digits and punctuation.
const TOKEN_SECRET = 'sk-1a2B3c4D5e6F7g8H9i0J-kLmNoP';

ruleTester.run('no-hardcoded-secrets', NoHardcodedSecretsRule, {
	valid: [
		// Non-secret variable names are never inspected.
		{ name: 'non-secret variable name', code: `const label = '${HEX_SECRET}';` },
		{ name: 'unrelated name with long value', code: `const description = '${TOKEN_SECRET}';` },

		// Secret-named variables with short values are ignored (< 16 chars).
		{ name: 'short secret value', code: "const apiKey = 'short';" },
		{ name: '15 chars, below minimum', code: "const token = 'abcdef012345678';" },

		// Secret-named variables holding prose / human-readable strings.
		{
			name: 'secret name with human text',
			code: "const passwordHint = 'Enter your account password here';",
		},
		{
			name: 'secret name with spaces in value',
			code: "const secretNote = 'this is not a secret';",
		},

		// Plain long camelCase word is not token-shaped (no digits/punctuation).
		{ name: 'long word without digits', code: "const tokenName = 'anExtraordinarilyLongName';" },

		// Dotted / hyphenated / snake_case constants without a digit+letter mix
		// are common (scopes, paths, ids) and must not be treated as secrets.
		{ name: 'dotted scope string', code: "const authScope = 'read.write.admin.profile.email';" },
		{ name: 'hyphenated slug', code: "const secretName = 'my-very-long-descriptive-slug';" },
		{ name: 'snake_case constant', code: "const tokenType = 'refresh_token_grant_type_value';" },

		// Secret-shaped name but non-secret value: the value gate, not the name,
		// is what decides. `tokenId` no longer benefits from a name exclusion, so
		// this proves a benign value still passes on its own merits.
		{
			name: 'tokenId with human-readable value',
			code: "const tokenId = 'primary-session-reference';",
		},

		// Obvious placeholders are skipped.
		{ name: 'placeholder value', code: "const apiKey = 'your-api-key-goes-here-xxxx';" },
		{ name: 'example placeholder', code: `const secret = 'example-secret-${HEX_SECRET}';` },

		// Not a static string literal.
		{ name: 'value from env', code: 'const apiKey = process.env.API_KEY;' },
		// The payload must itself contain `${` to be a real template literal.
		// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
		{ name: 'template literal with expression', code: 'const token = `${suffix}`;' },
		{ name: 'computed member assignment', code: `obj[key] = '${HEX_SECRET}';` },
	],
	invalid: [
		{
			name: 'SECURITY: exactly 16 chars is flagged (minimum length)',
			code: "const token = 'abcdef0123456789';",
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'token' } }],
		},
		{
			name: 'SECURITY: hex secret in variable',
			code: `const apiKey = '${HEX_SECRET}';`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'apiKey' } }],
		},
		{
			name: 'SECURITY: token-shaped secret in variable',
			code: `const accessToken = '${TOKEN_SECRET}';`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'accessToken' } }],
		},
		{
			name: 'SECURITY: secret in object property (identifier key)',
			code: `const config = { clientSecret: '${HEX_SECRET}' };`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'clientSecret' } }],
		},
		{
			name: 'SECURITY: secret in object property (string key)',
			code: `const config = { 'api_key': '${HEX_SECRET}' };`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'api_key' } }],
		},
		{
			name: 'SECURITY: secret in class field',
			code: `class C { private password = '${TOKEN_SECRET}'; }`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'password' } }],
		},
		{
			name: 'SECURITY: secret in member assignment',
			code: `this.authToken = '${HEX_SECRET}';`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'authToken' } }],
		},
		{
			name: 'SECURITY: secret in identifier assignment',
			code: `secretKey = '${TOKEN_SECRET}';`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'secretKey' } }],
		},
		{
			name: 'SECURITY: secret in no-expression template literal',
			code: `const apiKey = \`${HEX_SECRET}\`;`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'apiKey' } }],
		},
		// No name exclusions: a secret-shaped value is flagged even when the name
		// also contains a normally-"non-sensitive" fragment (url/pub/id).
		{
			name: 'SECURITY: secret on name containing "pub"',
			code: `const publicKey = '${HEX_SECRET}';`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'publicKey' } }],
		},
		{
			name: 'SECURITY: secret on name containing "id"',
			code: `const tokenId = '${HEX_SECRET}';`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'tokenId' } }],
		},
		{
			name: 'SECURITY: secret on name containing "url"',
			code: `const tokenUrl = '${TOKEN_SECRET}';`,
			errors: [{ messageId: 'hardcodedSecret', data: { name: 'tokenUrl' } }],
		},
	],
});
