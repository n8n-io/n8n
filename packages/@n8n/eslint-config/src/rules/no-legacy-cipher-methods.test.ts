import { RuleTester } from '@typescript-eslint/rule-tester';
import path from 'node:path';
import { NoLegacyCipherMethodsRule } from './no-legacy-cipher-methods.js';

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
	encrypt(data: string | object, customEncryptionKey?: string): string { return ''; }
	decrypt(data: string, customEncryptionKey?: string): string { return ''; }
	async encryptV2(data: string | object): Promise<string> { return ''; }
	async decryptV2(data: string): Promise<string> { return ''; }
	encryptWithKey(data: string, key: string): string { return ''; }
	decryptWithKey(data: string, key: string): string { return ''; }
}
`;

ruleTester.run('no-legacy-cipher-methods', NoLegacyCipherMethodsRule, {
	valid: [
		// The V2 and explicit-key methods are the sanctioned paths
		{
			code: `${cipherClass}
declare const cipher: Cipher;
void cipher.encryptV2('data');
void cipher.decryptV2('data');
cipher.encryptWithKey('data', 'key');
cipher.decryptWithKey('data', 'key');`,
			filename: 'service.ts',
		},
		// encrypt/decrypt on unrelated types stay allowed (e.g. CredentialsService.decrypt)
		{
			code: `class CredentialsService {
	async decrypt(credential: object, full = false): Promise<object> { return {}; }
}
declare const credentialsService: CredentialsService;
void credentialsService.decrypt({}, true);`,
			filename: 'service.ts',
		},
		// Test files are exempt: they cover reading the legacy CBC format
		{
			code: `${cipherClass}
declare const cipher: Cipher;
cipher.encrypt('data');
cipher.decrypt('data');`,
			filename: 'cipher.test.ts',
		},
		{
			code: `${cipherClass}
declare const cipher: Cipher;
cipher.encrypt('data');`,
			filename: `${path.sep}repo${path.sep}packages${path.sep}cli${path.sep}test${path.sep}integration${path.sep}setup.ts`,
			// The file-name exemption fires before the rule requests type
			// services, so this out-of-project path must parse untyped.
			languageOptions: { parserOptions: { projectService: false } },
		},
	],
	invalid: [
		{
			code: `${cipherClass}
declare const cipher: Cipher;
cipher.encrypt('data');`,
			filename: 'service.ts',
			errors: [{ messageId: 'noLegacyCipherMethods', data: { method: 'encrypt' } }],
		},
		{
			code: `${cipherClass}
declare const cipher: Cipher;
cipher.decrypt('data');`,
			filename: 'service.ts',
			errors: [{ messageId: 'noLegacyCipherMethods', data: { method: 'decrypt' } }],
		},
		// Receiver resolved through a property, as in DI (`this.cipher`)
		{
			code: `${cipherClass}
class MyService {
	constructor(private readonly cipher: Cipher) {}
	run() { return this.cipher.encrypt('data'); }
}`,
			filename: 'service.ts',
			errors: [{ messageId: 'noLegacyCipherMethods', data: { method: 'encrypt' } }],
		},
		// Computed access with a string literal must not slip through
		{
			code: `${cipherClass}
declare const cipher: Cipher;
cipher['decrypt']('data');`,
			filename: 'service.ts',
			errors: [{ messageId: 'noLegacyCipherMethods', data: { method: 'decrypt' } }],
		},
		// Optional chaining must not slip through
		{
			code: `${cipherClass}
declare const cipher: Cipher;
cipher?.encrypt('data');`,
			filename: 'service.ts',
			errors: [{ messageId: 'noLegacyCipherMethods', data: { method: 'encrypt' } }],
		},
	],
});
