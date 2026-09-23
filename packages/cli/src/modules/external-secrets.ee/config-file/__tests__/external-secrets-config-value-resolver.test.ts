import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
	resolveConfigFileSettings,
	resolveConfigFileValue,
} from '../external-secrets-config-value-resolver';

describe('resolveConfigFileValue', () => {
	test('returns a literal string unchanged', () => {
		expect(resolveConfigFileValue('literal-value', 'test')).toBe('literal-value');
	});

	test('resolves fromEnv when the env var is set', () => {
		process.env.TEST_RESOLVER_VAR = 'from-env-value';
		expect(resolveConfigFileValue({ fromEnv: 'TEST_RESOLVER_VAR' }, 'test')).toBe('from-env-value');
		delete process.env.TEST_RESOLVER_VAR;
	});

	test('throws when fromEnv references a missing env var', () => {
		delete process.env.TEST_RESOLVER_MISSING_VAR;
		expect(() =>
			resolveConfigFileValue({ fromEnv: 'TEST_RESOLVER_MISSING_VAR' }, 'test (field "token")'),
		).toThrow('test (field "token"): environment variable "TEST_RESOLVER_MISSING_VAR" is not set');
	});

	describe('fromFile', () => {
		let dir: string;

		beforeEach(() => {
			dir = mkdtempSync(join(tmpdir(), 'n8n-config-resolver-test-'));
		});

		afterEach(() => {
			rmSync(dir, { recursive: true, force: true });
		});

		test('reads and trims file contents', () => {
			const filePath = join(dir, 'secret.txt');
			writeFileSync(filePath, '  file-secret-value\n');

			expect(resolveConfigFileValue({ fromFile: filePath }, 'test')).toBe('file-secret-value');
		});

		test('throws when the file does not exist', () => {
			const filePath = join(dir, 'does-not-exist.txt');

			expect(() =>
				resolveConfigFileValue({ fromFile: filePath }, 'test (field "secretId")'),
			).toThrow(/test \(field "secretId"\): could not read file/);
		});
	});
});

describe('resolveConfigFileSettings', () => {
	test('resolves every field and aggregates all errors together', () => {
		process.env.TEST_RESOLVER_VAR = 'resolved';

		const resolved = resolveConfigFileSettings(
			{
				url: 'https://vault.example.com',
				roleId: 'abc',
				secretId: { fromEnv: 'TEST_RESOLVER_VAR' },
			},
			'connection "vault-prod"',
		);

		expect(resolved).toEqual({
			url: 'https://vault.example.com',
			roleId: 'abc',
			secretId: 'resolved',
		});

		delete process.env.TEST_RESOLVER_VAR;
	});

	test('aggregates errors from multiple fields into one thrown error', () => {
		delete process.env.TEST_RESOLVER_MISSING_A;
		delete process.env.TEST_RESOLVER_MISSING_B;

		expect(() =>
			resolveConfigFileSettings(
				{
					fieldA: { fromEnv: 'TEST_RESOLVER_MISSING_A' },
					fieldB: { fromEnv: 'TEST_RESOLVER_MISSING_B' },
				},
				'connection "vault-prod"',
			),
		).toThrow(/TEST_RESOLVER_MISSING_A[\s\S]*TEST_RESOLVER_MISSING_B/);
	});
});
