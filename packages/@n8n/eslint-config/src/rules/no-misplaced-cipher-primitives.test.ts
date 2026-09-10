import { RuleTester } from '@typescript-eslint/rule-tester';
import path from 'node:path';
import { NoMisplacedCipherPrimitivesRule } from './no-misplaced-cipher-primitives.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parserOptions: {
			projectService: {
				allowDefaultProject: ['*.ts'],
			},
			tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
		},
	},
});

/** Minimal stand-in mirroring the shape of `Cipher` from n8n-core. */
const cipherClass = `
class Cipher {
	encryptWithKey(data: string, key: string, algorithm: string): string { return ''; }
	decryptWithKey(data: string, key: string, algorithm: string): string { return ''; }
	async encryptV2(data: string | object): Promise<string> { return ''; }
}
`;

const untypedParse = { parserOptions: { projectService: false as const } };

ruleTester.run('no-misplaced-cipher-primitives', NoMisplacedCipherPrimitivesRule, {
	valid: [
		// The encryption area itself may use the primitives
		{
			code: "import { CipherAes256CBC } from './aes-256-cbc';",
			filename: `${path.sep}repo${path.sep}packages${path.sep}core${path.sep}src${path.sep}encryption${path.sep}cipher.ts`,
			languageOptions: untypedParse,
		},
		// Database migrations may use them
		{
			code: "import { CipherAes256GCM } from 'n8n-core';",
			filename: `${path.sep}repo${path.sep}packages${path.sep}@n8n${path.sep}db${path.sep}src${path.sep}migrations${path.sep}common${path.sep}123-Migrate.ts`,
			languageOptions: untypedParse,
		},
		// Test files stay free
		{
			code: "import { CipherAes256CBC } from 'n8n-core';",
			filename: 'cipher.test.ts',
		},
		// The V2 path is the sanctioned one
		{
			code: `${cipherClass}
declare const cipher: Cipher;
void cipher.encryptV2('data');`,
			filename: 'service.ts',
		},
		// Wildcard re-exports of unrelated modules are fine
		{
			code: "export * from './utils';",
			filename: 'index.ts',
		},
		// encryptWithKey on an unrelated type stays allowed
		{
			code: `class Vault {
	encryptWithKey(data: string, key: string): string { return ''; }
}
declare const vault: Vault;
vault.encryptWithKey('d', 'k');`,
			filename: 'service.ts',
		},
	],
	invalid: [
		{
			code: "import { CipherAes256CBC } from 'n8n-core';",
			filename: 'service.ts',
			errors: [{ messageId: 'noPrimitiveReference', data: { name: 'CipherAes256CBC' } }],
		},
		{
			code: "import { CipherAes256GCM } from '../encryption/aes-256-gcm';",
			filename: 'service.ts',
			errors: [{ messageId: 'noPrimitiveReference', data: { name: 'CipherAes256GCM' } }],
		},
		// Re-exports launder the class behind a different import path
		{
			code: "export { CipherAes256CBC } from 'n8n-core';",
			filename: 'helper.ts',
			errors: [{ messageId: 'noPrimitiveReference', data: { name: 'CipherAes256CBC' } }],
		},
		// … and so do wildcard re-exports, which carry no identifier
		{
			code: "export * from 'n8n-core';",
			filename: 'helper.ts',
			errors: [{ messageId: 'noWildcardReexport', data: { source: 'n8n-core' } }],
		},
		// A directory merely named "migrations" is not the database migration root
		{
			code: "import { CipherAes256CBC } from 'n8n-core';",
			filename: `${path.sep}repo${path.sep}packages${path.sep}cli${path.sep}src${path.sep}nodes${path.sep}migrations${path.sep}helper.ts`,
			languageOptions: untypedParse,
			errors: [{ messageId: 'noPrimitiveReference', data: { name: 'CipherAes256CBC' } }],
		},
		// Namespace member access
		{
			code: `import * as core from 'n8n-core';
export const probe = () => new core.CipherAes256CBC();`,
			filename: 'service.ts',
			errors: [{ messageId: 'noPrimitiveReference', data: { name: 'CipherAes256CBC' } }],
		},
		// Dynamic import destructuring — the shape AGENTS.md recommends for lazy loads
		{
			code: `export const probe = async () => {
	const { CipherAes256GCM } = await import('n8n-core');
	return new CipherAes256GCM();
};`,
			filename: 'service.ts',
			errors: [
				{ messageId: 'noPrimitiveReference', data: { name: 'CipherAes256GCM' } },
				{ messageId: 'noPrimitiveReference', data: { name: 'CipherAes256GCM' } },
			],
		},
		{
			code: `${cipherClass}
declare const cipher: Cipher;
cipher.encryptWithKey('d', 'k', 'aes-256-cbc');`,
			filename: 'service.ts',
			errors: [{ messageId: 'noExplicitKeyCall', data: { method: 'encryptWithKey' } }],
		},
		// Bound method references escape without ever being a call expression
		{
			code: `${cipherClass}
declare const cipher: Cipher;
export const leak = cipher.encryptWithKey;`,
			filename: 'service.ts',
			errors: [{ messageId: 'noExplicitKeyCall', data: { method: 'encryptWithKey' } }],
		},
		// Subclasses inherit the explicit-key methods
		{
			code: `${cipherClass}
class ExtendedCipher extends Cipher {}
declare const extended: ExtendedCipher;
extended.decryptWithKey('d', 'k', 'aes-256-cbc');`,
			filename: 'service.ts',
			errors: [{ messageId: 'noExplicitKeyCall', data: { method: 'decryptWithKey' } }],
		},
		// A generic receiver constrained to Cipher can be one at runtime
		{
			code: `${cipherClass}
export function encode<T extends Cipher>(cipher: T) {
	return cipher.encryptWithKey('d', 'k', 'aes-256-cbc');
}`,
			filename: 'service.ts',
			errors: [{ messageId: 'noExplicitKeyCall', data: { method: 'encryptWithKey' } }],
		},
		{
			code: `${cipherClass}
declare const cipher: Cipher;
cipher?.decryptWithKey('d', 'k', 'aes-256-cbc');`,
			filename: 'service.ts',
			errors: [{ messageId: 'noExplicitKeyCall', data: { method: 'decryptWithKey' } }],
		},
		{
			code: `${cipherClass}
declare const cipher: Cipher;
cipher['encryptWithKey']('d', 'k', 'aes-256-cbc');`,
			filename: 'service.ts',
			errors: [{ messageId: 'noExplicitKeyCall', data: { method: 'encryptWithKey' } }],
		},
	],
});
