import type { SecretsManifest } from '../contracts';
import { GUARDRAILS_RUNTIME_SOURCE } from '../harness-assets/guardrails-runtime';
import { MANIFEST_RUNTIME_SOURCE } from '../harness-assets/manifest-runtime';

interface SecretValue {
	label: string;
	value: string;
}

interface GuardrailsRuntime {
	parseSecretsManifest(jsonText: unknown): SecretsManifest | null;
	collectSecretValues(
		manifest: SecretsManifest | null,
		env: Record<string, string | undefined>,
	): SecretValue[];
	redactSecrets(text: string, secrets: SecretValue[]): string;
	findEnvDumpBlockReason(command: string, secretEnvVars: string[]): string | null;
}

// Evaluating the shipped source strings (the exact code the sandbox receives)
// keeps these tests honest — there is no second implementation to drift from.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const buildRuntime = new Function(
	`${MANIFEST_RUNTIME_SOURCE}\n${GUARDRAILS_RUNTIME_SOURCE}\n` +
		'return { parseSecretsManifest, collectSecretValues, redactSecrets, findEnvDumpBlockReason };',
) as () => GuardrailsRuntime;
const runtime = buildRuntime();

describe('parseSecretsManifest', () => {
	it('parses a valid manifest', () => {
		const manifest = runtime.parseSecretsManifest(
			JSON.stringify({
				version: 1,
				secrets: [{ envVar: 'N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN', label: 'GOOGLE_TOKEN' }],
			}),
		);
		expect(manifest).toEqual({
			version: 1,
			secrets: [{ envVar: 'N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN', label: 'GOOGLE_TOKEN' }],
		});
	});

	it('strips unknown keys from entries', () => {
		const manifest = runtime.parseSecretsManifest(
			JSON.stringify({
				version: 1,
				secrets: [{ envVar: 'A_VAR', label: 'A', value: 'must-never-be-here' }],
			}),
		);
		expect(manifest).toEqual({ version: 1, secrets: [{ envVar: 'A_VAR', label: 'A' }] });
	});

	it.each([
		['malformed JSON', 'not json'],
		['empty string', ''],
		['wrong version', JSON.stringify({ version: 2, secrets: [] })],
		['non-array secrets', JSON.stringify({ version: 1, secrets: {} })],
		['entry missing label', JSON.stringify({ version: 1, secrets: [{ envVar: 'X' }] })],
		['non-object entry', JSON.stringify({ version: 1, secrets: ['X'] })],
		['array root', JSON.stringify([])],
	])('returns null for %s', (_name, input) => {
		expect(runtime.parseSecretsManifest(input)).toBeNull();
	});
});

describe('collectSecretValues', () => {
	const manifest: SecretsManifest = {
		version: 1,
		secrets: [
			{ envVar: 'N8N_TASK_A_TOKEN', label: 'A_TOKEN' },
			{ envVar: 'N8N_TASK_B_KEY', label: 'B_KEY' },
			{ envVar: 'N8N_TASK_C_SHORT', label: 'C_SHORT' },
		],
	};

	it('resolves manifest names to values present in env', () => {
		const values = runtime.collectSecretValues(manifest, {
			N8N_TASK_A_TOKEN: 'secret-value-a',
			N8N_TASK_B_KEY: 'secret-value-b',
			UNRELATED: 'not-collected',
		});
		expect(values).toEqual([
			{ label: 'A_TOKEN', value: 'secret-value-a' },
			{ label: 'B_KEY', value: 'secret-value-b' },
		]);
	});

	it('skips values too short to redact safely', () => {
		const values = runtime.collectSecretValues(manifest, { N8N_TASK_C_SHORT: 'ok' });
		expect(values).toEqual([]);
	});

	it('returns empty for a null manifest', () => {
		expect(runtime.collectSecretValues(null, { N8N_TASK_A_TOKEN: 'secret-value-a' })).toEqual([]);
	});
});

describe('redactSecrets', () => {
	const secrets: SecretValue[] = [{ label: 'GOOGLE_TOKEN', value: 'ya29.a0AfH6SMB-token' }];

	it('replaces a single occurrence with the labelled marker', () => {
		expect(runtime.redactSecrets('Bearer ya29.a0AfH6SMB-token sent', secrets)).toBe(
			'Bearer [REDACTED:GOOGLE_TOKEN] sent',
		);
	});

	it('replaces every occurrence', () => {
		const text = 'a ya29.a0AfH6SMB-token b ya29.a0AfH6SMB-token c ya29.a0AfH6SMB-token';
		expect(runtime.redactSecrets(text, secrets)).toBe(
			'a [REDACTED:GOOGLE_TOKEN] b [REDACTED:GOOGLE_TOKEN] c [REDACTED:GOOGLE_TOKEN]',
		);
	});

	it('redacts values embedded in JSON output', () => {
		const payload = JSON.stringify({
			headers: { authorization: 'Bearer ya29.a0AfH6SMB-token' },
			nested: [{ token: 'ya29.a0AfH6SMB-token' }],
		});
		const redacted = runtime.redactSecrets(payload, secrets);
		expect(redacted).not.toContain('ya29.a0AfH6SMB-token');
		expect(redacted).toContain('[REDACTED:GOOGLE_TOKEN]');
	});

	it('redacts the JSON-escaped shape of values containing quotes', () => {
		const trickySecrets: SecretValue[] = [{ label: 'TRICKY', value: 'pa"ss\\word' }];
		const serialized = JSON.stringify({ secret: 'pa"ss\\word' });
		const redacted = runtime.redactSecrets(serialized, trickySecrets);
		expect(redacted).toBe('{"secret":"[REDACTED:TRICKY]"}');
	});

	it('redacts the URL-encoded shape of values', () => {
		const urlSecrets: SecretValue[] = [{ label: 'KEY', value: 'a b&c=d' }];
		const text = 'GET /x?key=' + encodeURIComponent('a b&c=d') + ' raw:a b&c=d';
		const redacted = runtime.redactSecrets(text, urlSecrets);
		expect(redacted).toBe('GET /x?key=[REDACTED:KEY] raw:[REDACTED:KEY]');
	});

	it('redacts longer values first so contained secrets leave no fragment', () => {
		const layered: SecretValue[] = [
			{ label: 'SHORT', value: 'secret-core' },
			{ label: 'LONG', value: 'secret-core-with-suffix' },
		];
		expect(runtime.redactSecrets('x secret-core-with-suffix y', layered)).toBe(
			'x [REDACTED:LONG] y',
		);
	});

	it('leaves text without secrets untouched', () => {
		expect(runtime.redactSecrets('nothing to see here', secrets)).toBe('nothing to see here');
	});
});

describe('findEnvDumpBlockReason', () => {
	const secretEnvVars = ['N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN', 'N8N_TASK_SLACK_API_KEY'];
	const block = (command: string) => runtime.findEnvDumpBlockReason(command, secretEnvVars);

	it.each([
		'env',
		'env -0',
		'/usr/bin/env',
		'printenv',
		'printenv PATH',
		'printenv N8N_TASK_SLACK_API_KEY',
		'set',
		'export',
		'export -p',
		'declare -p',
		'typeset -p',
		'echo $N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN',
		// Assembled to keep the shell brace form out of lint's interpolation checks.
		'echo "$' + '{N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN}"',
		'printf \'%s\' "$N8N_TASK_SLACK_API_KEY"',
		'cat /proc/self/environ',
		'xxd /proc/1/environ',
		'ls -la && env',
		'node run.js; printenv',
		'history | env',
	])('blocks %j', (command) => {
		expect(block(command)).toEqual(expect.stringContaining('Blocked'));
	});

	it.each([
		'env FOO=1 node script.js',
		'env -i sh -c "node run.js"',
		'set -euo pipefail',
		'export FOO=bar',
		'declare -r FOO=bar',
		'echo hello world',
		'echo $HOME',
		'echo "$N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN_IS_NOT_THIS_VAR"',
		'curl -H "Authorization: Bearer $N8N_TASK_GOOGLE_SHEETS_ACCESS_TOKEN" https://api.example.test',
		'node run.js',
		"printf '%s\\n' done",
		'grep environ notes.txt',
		'',
		'   ',
	])('allows %j', (command) => {
		expect(block(command)).toBeNull();
	});

	it('explains how to work with credentials instead', () => {
		expect(block('printenv')).toEqual(expect.stringContaining('list_credentials'));
	});

	it('names the env var when blocking a print of it', () => {
		expect(block('echo $N8N_TASK_SLACK_API_KEY')).toEqual(
			expect.stringContaining('N8N_TASK_SLACK_API_KEY'),
		);
	});
});
