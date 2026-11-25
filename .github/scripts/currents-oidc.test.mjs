import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
	CURRENTS_CANCEL_RUN_URL,
	CURRENTS_OIDC_REVOKE_URL,
	CURRENTS_OIDC_TOKEN_URL,
	MAX_RETRY_AFTER_MS,
	OIDC_AUDIENCE,
	cancelCurrentsRun,
	main,
	mintCurrentsRecordKey,
	parseRetryAfterMs,
	revokeCurrentsRecordKey,
} from './currents-oidc.mjs';

/**
 * Run with:
 *   node --test .github/scripts/currents-oidc.test.mjs
 */

const createBuffer = () => {
	let content = '';
	return {
		write(chunk) {
			content += String(chunk);
		},
		toString() {
			return content;
		},
	};
};

const jsonResponse = (body, { status = 200, headers = {} } = {}) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...headers },
	});

describe('parseRetryAfterMs', () => {
	it('parses delay-seconds headers', () => {
		assert.equal(parseRetryAfterMs('5', 0), 5000);
		assert.equal(parseRetryAfterMs('0', 0), 0);
		assert.equal(parseRetryAfterMs('1.5', 0), 1500);
	});

	it('caps numeric Retry-After values at 60 seconds', () => {
		assert.equal(parseRetryAfterMs('120', 0), MAX_RETRY_AFTER_MS);
		assert.equal(parseRetryAfterMs('60', 0), MAX_RETRY_AFTER_MS);
	});

	it('parses HTTP-date headers and caps them at 60 seconds', () => {
		const now = Date.parse('Wed, 25 Nov 2026 12:00:00 GMT');
		assert.equal(
			parseRetryAfterMs('Wed, 25 Nov 2026 12:00:15 GMT', 0, () => now),
			15_000,
		);
		assert.equal(
			parseRetryAfterMs('Wed, 25 Nov 2026 12:05:00 GMT', 0, () => now),
			MAX_RETRY_AFTER_MS,
		);
		assert.equal(
			parseRetryAfterMs('Wed, 25 Nov 2026 11:59:00 GMT', 0, () => now),
			0,
		);
	});

	it('falls back to bounded exponential backoff when missing or invalid', () => {
		assert.equal(parseRetryAfterMs(null, 0), 1000);
		assert.equal(parseRetryAfterMs('', 1), 2000);
		assert.equal(parseRetryAfterMs('-5', 2), 4000);
		assert.equal(parseRetryAfterMs('not-a-date', 3), 8000);
		assert.equal(parseRetryAfterMs(undefined, 10), MAX_RETRY_AFTER_MS);
	});
});

describe('mintCurrentsRecordKey', () => {
	it('exchanges the GitHub OIDC token, masks both tokens, and writes GITHUB_ENV', async (t) => {
		const dir = mkdtempSync(join(tmpdir(), 'currents-oidc-'));
		t.after(() => rmSync(dir, { recursive: true, force: true }));
		const githubEnv = join(dir, 'github_env');
		writeFileSync(githubEnv, '');

		const calls = [];
		const events = [];
		const stdout = {
			write(chunk) {
				events.push(['stdout', String(chunk)]);
			},
		};
		const stderr = createBuffer();

		const fetchFn = async (url, init) => {
			calls.push({ url, init });
			if (calls.length === 1) {
				return jsonResponse({ value: 'gh-oidc-jwt-secret' });
			}
			return jsonResponse({ access_token: 'crnts_ci_ephemeral_123', expires_in: 3600 });
		};

		const appendFileFn = (file, data, encoding) => {
			events.push(['env', data]);
			writeFileSync(file, data, { encoding, flag: 'a' });
		};

		const result = await mintCurrentsRecordKey({
			env: {
				CURRENTS_OIDC_POLICY_ID: 'policy-abc',
				ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example.test/idtoken?api-version=2.0',
				ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'gh-req-token',
				GITHUB_ENV: githubEnv,
			},
			fetchFn,
			stdout,
			stderr,
			appendFileFn,
		});

		assert.deepEqual(result, { mode: 'oidc', exported: true, expiresIn: 3600 });
		assert.equal(calls.length, 2);

		const oidcUrl = new URL(calls[0].url);
		assert.equal(oidcUrl.origin + oidcUrl.pathname, 'https://oidc.example.test/idtoken');
		assert.equal(oidcUrl.searchParams.get('api-version'), '2.0');
		assert.equal(oidcUrl.searchParams.get('audience'), OIDC_AUDIENCE);
		assert.equal(calls[0].init.method, 'GET');
		assert.equal(calls[0].init.headers.Authorization, 'bearer gh-req-token');

		assert.equal(calls[1].url, CURRENTS_OIDC_TOKEN_URL);
		assert.equal(calls[1].init.method, 'POST');
		assert.equal(calls[1].init.headers['Content-Type'], 'application/x-www-form-urlencoded');
		const params = new URLSearchParams(String(calls[1].init.body));
		assert.equal(params.get('grant_type'), 'urn:ietf:params:oauth:grant-type:token-exchange');
		assert.equal(params.get('subject_token'), 'gh-oidc-jwt-secret');
		assert.equal(params.get('subject_token_type'), 'urn:ietf:params:oauth:token-type:jwt');
		assert.equal(params.get('policy_id'), 'policy-abc');

		assert.equal(readFileSync(githubEnv, 'utf8'), 'CURRENTS_RECORD_KEY=crnts_ci_ephemeral_123\n');

		const maskJwtIndex = events.findIndex(
			([kind, text]) => kind === 'stdout' && text === '::add-mask::gh-oidc-jwt-secret\n',
		);
		const maskKeyIndex = events.findIndex(
			([kind, text]) => kind === 'stdout' && text === '::add-mask::crnts_ci_ephemeral_123\n',
		);
		const envWriteIndex = events.findIndex(([kind]) => kind === 'env');
		assert.ok(maskJwtIndex >= 0, 'OIDC JWT must be masked');
		assert.ok(maskKeyIndex > maskJwtIndex, 'record key must be masked after JWT');
		assert.ok(envWriteIndex > maskKeyIndex, 'record key must be masked before writing GITHUB_ENV');
	});

	it('retries HTTP 429 responses honoring Retry-After and capping at 60s', async (t) => {
		const dir = mkdtempSync(join(tmpdir(), 'currents-oidc-429-'));
		t.after(() => rmSync(dir, { recursive: true, force: true }));
		const githubEnv = join(dir, 'github_env');
		writeFileSync(githubEnv, '');

		const sleeps = [];
		let exchangeCalls = 0;
		const stdout = createBuffer();
		const stderr = createBuffer();

		const fetchFn = async (url) => {
			if (String(url).startsWith('https://oidc.example.test/')) {
				return jsonResponse({ value: 'jwt-value' });
			}
			exchangeCalls += 1;
			if (exchangeCalls === 1) {
				return new Response('rate limited', { status: 429, headers: { 'Retry-After': '7' } });
			}
			if (exchangeCalls === 2) {
				return new Response('rate limited', { status: 429, headers: { 'Retry-After': '180' } });
			}
			return jsonResponse({ access_token: 'crnts_ci_after_retry', expires_in: 1800 });
		};

		const result = await mintCurrentsRecordKey({
			env: {
				CURRENTS_OIDC_POLICY_ID: 'policy-429',
				ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example.test/idtoken',
				ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'req-token',
				GITHUB_ENV: githubEnv,
			},
			fetchFn,
			sleepFn: async (ms) => {
				sleeps.push(ms);
			},
			stdout,
			stderr,
		});

		assert.deepEqual(result, { mode: 'oidc', exported: true, expiresIn: 1800 });
		assert.equal(exchangeCalls, 3);
		assert.deepEqual(sleeps, [7000, MAX_RETRY_AFTER_MS]);
		assert.equal(readFileSync(githubEnv, 'utf8'), 'CURRENTS_RECORD_KEY=crnts_ci_after_retry\n');
		assert.doesNotMatch(stderr.toString(), /jwt-value|policy-429|crnts_ci_after_retry/);
	});

	it('skips cleanly on fork PRs when ACTIONS_ID_TOKEN_REQUEST_URL is unset', async (t) => {
		const dir = mkdtempSync(join(tmpdir(), 'currents-oidc-fork-'));
		t.after(() => rmSync(dir, { recursive: true, force: true }));
		const githubEnv = join(dir, 'github_env');
		writeFileSync(githubEnv, '');

		let fetchCalled = false;
		const stdout = createBuffer();

		const result = await mintCurrentsRecordKey({
			env: {
				CURRENTS_OIDC_POLICY_ID: 'policy-live',
				GITHUB_ENV: githubEnv,
			},
			fetchFn: async () => {
				fetchCalled = true;
				throw new Error('should not fetch');
			},
			stdout,
		});

		assert.deepEqual(result, { mode: 'skip', exported: false });
		assert.equal(fetchCalled, false);
		assert.equal(readFileSync(githubEnv, 'utf8'), '');
	});

	it('exports FALLBACK_CURRENTS_RECORD_KEY when CURRENTS_OIDC_POLICY_ID is empty', async (t) => {
		const dir = mkdtempSync(join(tmpdir(), 'currents-oidc-fallback-'));
		t.after(() => rmSync(dir, { recursive: true, force: true }));
		const githubEnv = join(dir, 'github_env');
		writeFileSync(githubEnv, '');

		let fetchCalled = false;
		const stdout = createBuffer();

		const result = await mintCurrentsRecordKey({
			env: {
				CURRENTS_OIDC_POLICY_ID: '',
				FALLBACK_CURRENTS_RECORD_KEY: 'dashboard-static-record-key',
				GITHUB_ENV: githubEnv,
			},
			fetchFn: async () => {
				fetchCalled = true;
				throw new Error('should not fetch');
			},
			stdout,
		});

		assert.deepEqual(result, { mode: 'fallback', exported: true });
		assert.equal(fetchCalled, false);
		assert.ok(stdout.toString().includes('::add-mask::dashboard-static-record-key\n'));
		assert.equal(
			readFileSync(githubEnv, 'utf8'),
			'CURRENTS_RECORD_KEY=dashboard-static-record-key\n',
		);
	});

	it('skips cleanly when both CURRENTS_OIDC_POLICY_ID and fallback key are empty', async (t) => {
		const dir = mkdtempSync(join(tmpdir(), 'currents-oidc-empty-'));
		t.after(() => rmSync(dir, { recursive: true, force: true }));
		const githubEnv = join(dir, 'github_env');
		writeFileSync(githubEnv, '');

		const stdout = createBuffer();
		const result = await mintCurrentsRecordKey({
			env: {
				CURRENTS_OIDC_POLICY_ID: '',
				FALLBACK_CURRENTS_RECORD_KEY: '',
				GITHUB_ENV: githubEnv,
			},
			fetchFn: async () => {
				throw new Error('should not fetch');
			},
			stdout,
		});

		assert.deepEqual(result, { mode: 'skip', exported: false });
		assert.equal(readFileSync(githubEnv, 'utf8'), '');
	});

	it('never leaks JWT, policy ID, or response body on exchange failure', async () => {
		const stdout = createBuffer();
		const stderr = createBuffer();

		const fetchFn = async (url) => {
			if (String(url).startsWith('https://oidc.example.test/')) {
				return jsonResponse({ value: 'super-secret-jwt' });
			}
			return new Response('policy secret-policy-id rejected super-secret-jwt', { status: 403 });
		};

		await assert.rejects(
			() =>
				mintCurrentsRecordKey({
					env: {
						CURRENTS_OIDC_POLICY_ID: 'secret-policy-id',
						ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example.test/idtoken',
						ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'req-token',
					},
					fetchFn,
					stdout,
					stderr,
				}),
			(error) => {
				assert.match(error.message, /HTTP 403/);
				assert.doesNotMatch(error.message, /super-secret-jwt|secret-policy-id/);
				return true;
			},
		);
	});

	it('rejects tokens containing newline characters before writing GITHUB_ENV', async (t) => {
		const dir = mkdtempSync(join(tmpdir(), 'currents-oidc-nl-'));
		t.after(() => rmSync(dir, { recursive: true, force: true }));
		const githubEnv = join(dir, 'github_env');
		writeFileSync(githubEnv, '');

		const stdout = createBuffer();
		const fetchFn = async (url) => {
			if (String(url).startsWith('https://oidc.example.test/')) {
				return jsonResponse({ value: 'valid-jwt' });
			}
			return jsonResponse({ access_token: 'crnts_ci_ok\nEVIL=1' });
		};

		await assert.rejects(
			() =>
				mintCurrentsRecordKey({
					env: {
						CURRENTS_OIDC_POLICY_ID: 'policy-1',
						ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example.test/idtoken',
						ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'req-token',
						GITHUB_ENV: githubEnv,
					},
					fetchFn,
					stdout,
				}),
			/newline/,
		);
		assert.equal(readFileSync(githubEnv, 'utf8'), '');
	});
});

describe('revokeCurrentsRecordKey', () => {
	it('revokes OIDC-issued keys starting with crnts_ci_', async () => {
		const calls = [];
		const stdout = createBuffer();

		const result = await revokeCurrentsRecordKey({
			env: { CURRENTS_RECORD_KEY: 'crnts_ci_shortlived_999' },
			fetchFn: async (url, init) => {
				calls.push({ url, init });
				return new Response('', { status: 200 });
			},
			stdout,
		});

		assert.deepEqual(result, { revoked: true });
		assert.equal(calls.length, 1);
		assert.equal(calls[0].url, CURRENTS_OIDC_REVOKE_URL);
		assert.equal(calls[0].init.method, 'POST');
		assert.equal(calls[0].init.headers['Content-Type'], 'application/x-www-form-urlencoded');
		const params = new URLSearchParams(String(calls[0].init.body));
		assert.equal(params.get('token'), 'crnts_ci_shortlived_999');
		assert.equal(params.get('token_type_hint'), 'access_token');
	});

	it('never revokes a dashboard fallback key without the crnts_ci_ prefix', async () => {
		let fetchCalled = false;
		const stdout = createBuffer();

		const result = await revokeCurrentsRecordKey({
			env: { CURRENTS_RECORD_KEY: 'static-dashboard-key' },
			fetchFn: async () => {
				fetchCalled = true;
				throw new Error('must not call revoke for dashboard keys');
			},
			stdout,
		});

		assert.deepEqual(result, { revoked: false, reason: 'not-oidc' });
		assert.equal(fetchCalled, false);
	});

	it('skips revoke when CURRENTS_RECORD_KEY is empty', async () => {
		let fetchCalled = false;
		const stdout = createBuffer();

		const result = await revokeCurrentsRecordKey({
			env: { CURRENTS_RECORD_KEY: '' },
			fetchFn: async () => {
				fetchCalled = true;
				throw new Error('must not call revoke');
			},
			stdout,
		});

		assert.deepEqual(result, { revoked: false, reason: 'missing' });
		assert.equal(fetchCalled, false);
	});
});

describe('cancelCurrentsRun', () => {
	it('cancels the Currents run with recordKey, projectId, and ciBuildId', async () => {
		const calls = [];
		const stdout = createBuffer();

		const result = await cancelCurrentsRun({
			env: {
				CURRENTS_RECORD_KEY: 'crnts_ci_cancel_key',
				CURRENTS_PROJECT_ID: 'nHHLA5',
				CURRENTS_CI_BUILD_ID: 'n8n-io/n8n-12345-1',
			},
			fetchFn: async (url, init) => {
				calls.push({ url, init });
				return jsonResponse({ status: 'ok' });
			},
			stdout,
		});

		assert.deepEqual(result, { cancelled: true });
		assert.equal(calls.length, 1);
		assert.equal(calls[0].url, CURRENTS_CANCEL_RUN_URL);
		assert.equal(calls[0].init.method, 'POST');
		assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
		assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
			recordKey: 'crnts_ci_cancel_key',
			projectId: 'nHHLA5',
			ciBuildId: 'n8n-io/n8n-12345-1',
		});
	});

	it('retries HTTP 429 responses honoring Retry-After when cancelling a run', async () => {
		const sleeps = [];
		let attempts = 0;
		const stdout = createBuffer();
		const stderr = createBuffer();

		const result = await cancelCurrentsRun({
			env: {
				CURRENTS_RECORD_KEY: 'crnts_ci_cancel_retry_key',
				CURRENTS_PROJECT_ID: 'nHHLA5',
				CURRENTS_CI_BUILD_ID: 'n8n-io/n8n-12345-1',
			},
			fetchFn: async () => {
				attempts += 1;
				if (attempts === 1) {
					return new Response('rate limited', { status: 429, headers: { 'Retry-After': '4' } });
				}
				return jsonResponse({ status: 'ok' });
			},
			sleepFn: async (ms) => {
				sleeps.push(ms);
			},
			stdout,
			stderr,
		});

		assert.deepEqual(result, { cancelled: true });
		assert.equal(attempts, 2);
		assert.deepEqual(sleeps, [4000]);
		assert.doesNotMatch(stderr.toString(), /crnts_ci_cancel_retry_key/);
	});

	it('skips cancellation when any required env var is missing', async () => {
		for (const env of [
			{ CURRENTS_PROJECT_ID: 'nHHLA5', CURRENTS_CI_BUILD_ID: 'build-1' },
			{ CURRENTS_RECORD_KEY: 'crnts_ci_k', CURRENTS_CI_BUILD_ID: 'build-1' },
			{ CURRENTS_RECORD_KEY: 'crnts_ci_k', CURRENTS_PROJECT_ID: 'nHHLA5' },
		]) {
			let fetchCalled = false;
			const stdout = createBuffer();

			const result = await cancelCurrentsRun({
				env,
				fetchFn: async () => {
					fetchCalled = true;
					throw new Error('must not call cancel');
				},
				stdout,
			});

			assert.deepEqual(result, { cancelled: false, reason: 'missing-env' });
			assert.equal(fetchCalled, false);
		}
	});
});

describe('main CLI entry point', () => {
	it('emits a warning and returns 0 when revoke fails', async () => {
		const stdout = createBuffer();
		const stderr = createBuffer();

		const code = await main(['revoke'], {
			env: { CURRENTS_RECORD_KEY: 'crnts_ci_secret_token' },
			fetchFn: async () => new Response('crnts_ci_secret_token error', { status: 500 }),
			stdout,
			stderr,
		});

		assert.equal(code, 0);
		assert.match(
			stderr.toString(),
			/^::warning::Currents OIDC token revocation failed \(HTTP 500\)\n$/,
		);
		assert.doesNotMatch(stderr.toString(), /crnts_ci_secret_token/);
	});

	it('emits a warning and returns 0 when cancel fails', async () => {
		const stdout = createBuffer();
		const stderr = createBuffer();

		const code = await main(['cancel'], {
			env: {
				CURRENTS_RECORD_KEY: 'crnts_ci_secret_token',
				CURRENTS_PROJECT_ID: 'nHHLA5',
				CURRENTS_CI_BUILD_ID: 'build-1',
			},
			fetchFn: async () => new Response('not found', { status: 404 }),
			stdout,
			stderr,
		});

		assert.equal(code, 0);
		assert.match(stderr.toString(), /^::warning::Currents run cancellation failed \(HTTP 404\)\n$/);
		assert.doesNotMatch(stderr.toString(), /crnts_ci_secret_token/);
	});

	it('returns 1 on an unknown subcommand', async () => {
		const stderr = createBuffer();
		const code = await main(['bogus'], { stderr });
		assert.equal(code, 1);
		assert.match(stderr.toString(), /Usage:/);
	});

	it('can be imported without an argv entry', () => {
		const url = new URL('./currents-oidc.mjs', import.meta.url).href;
		execFileSync(
			process.execPath,
			['--input-type=module', '-e', `await import(${JSON.stringify(url)});`],
			{
				stdio: 'pipe',
			},
		);
	});
});
