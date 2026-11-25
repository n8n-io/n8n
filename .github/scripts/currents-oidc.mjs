#!/usr/bin/env node
/**
 * Manage short-lived Currents record keys via GitHub Actions OIDC.
 *
 * Subcommands:
 *   mint    Exchange the GitHub OIDC token for a Currents record key and export
 *           CURRENTS_RECORD_KEY to $GITHUB_ENV. Falls back to
 *           FALLBACK_CURRENTS_RECORD_KEY when CURRENTS_OIDC_POLICY_ID is empty.
 *           Exits 0 without exporting on fork PRs (no ACTIONS_ID_TOKEN_REQUEST_URL).
 *   revoke  Revoke an OIDC-issued Currents record key (crnts_ci_ prefix only).
 *   cancel  Cancel a Currents run using CURRENTS_RECORD_KEY, CURRENTS_PROJECT_ID,
 *           and CURRENTS_CI_BUILD_ID.
 *
 * Zero external dependencies: uses Node built-in fetch so every shard can run it
 * without extra installs.
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const OIDC_AUDIENCE = 'currents:record-key';
export const CURRENTS_OIDC_TOKEN_URL = 'https://cy.currents.dev/oidc/token';
export const CURRENTS_OIDC_REVOKE_URL = 'https://cy.currents.dev/oidc/revoke';
export const CURRENTS_CANCEL_RUN_URL = 'https://cy.currents.dev/v1/runs/cancel';
export const OIDC_KEY_PREFIX = 'crnts_ci_';
export const MAX_RETRY_AFTER_MS = 60_000;
export const DEFAULT_MAX_429_RETRIES = 5;

const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';
const JWT_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:jwt';

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function defaultSleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reject values containing newline characters so they cannot inject extra
 * workflow commands or GITHUB_ENV variables.
 *
 * @param {string} value
 * @param {string} label
 */
function assertSingleLine(value, label) {
	if (/[\r\n]/.test(value)) {
		throw new Error(`${label} contains invalid newline characters`);
	}
}

/**
 * Register a secret value with the GitHub Actions log masker.
 *
 * @param {string} value
 * @param {{ write(chunk: string): unknown }} stdout
 */
function maskValue(value, stdout) {
	stdout.write(`::add-mask::${value}\n`);
}

/**
 * Parse an HTTP Retry-After header (delay-seconds or HTTP-date) into
 * milliseconds, capped at MAX_RETRY_AFTER_MS. Falls back to bounded
 * exponential backoff when the header is missing or unparseable.
 *
 * @param {string | null | undefined} headerValue
 * @param {number} attempt 0-based retry index
 * @param {() => number} [nowFn]
 * @returns {number}
 */
export function parseRetryAfterMs(headerValue, attempt, nowFn = Date.now) {
	if (typeof headerValue === 'string') {
		const trimmed = headerValue.trim();
		if (trimmed !== '') {
			if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
				const seconds = Number(trimmed);
				if (Number.isFinite(seconds) && seconds >= 0) {
					return Math.min(Math.ceil(seconds * 1000), MAX_RETRY_AFTER_MS);
				}
				return Math.min(1000 * 2 ** attempt, MAX_RETRY_AFTER_MS);
			}

			const parsedDate = Date.parse(trimmed);
			if (!Number.isNaN(parsedDate)) {
				const deltaMs = Math.max(0, parsedDate - nowFn());
				return Math.min(deltaMs, MAX_RETRY_AFTER_MS);
			}
		}
	}

	return Math.min(1000 * 2 ** attempt, MAX_RETRY_AFTER_MS);
}

/**
 * Perform a fetch request, retrying HTTP 429 responses according to
 * Retry-After (capped at 60s).
 *
 * @param {string} url
 * @param {RequestInit} init
 * @param {{
 *   fetchFn?: typeof fetch,
 *   sleepFn?: (ms: number) => Promise<void>,
 *   nowFn?: () => number,
 *   stderr?: { write(chunk: string): unknown },
 *   maxRetries?: number,
 *   operation?: string,
 * }} [options]
 * @returns {Promise<Response>}
 */
async function fetchWithRateLimitRetry(url, init, options = {}) {
	const {
		fetchFn = globalThis.fetch,
		sleepFn = defaultSleep,
		nowFn = Date.now,
		stderr = process.stderr,
		maxRetries = DEFAULT_MAX_429_RETRIES,
		operation = 'Currents request',
	} = options;

	for (let attempt = 0; ; attempt++) {
		const response = await fetchFn(url, init);
		if (response.status !== 429 || attempt >= maxRetries) {
			return response;
		}

		await response.body?.cancel?.().catch(() => {});
		const retryAfter = response.headers?.get?.('retry-after') ?? null;
		const delayMs = parseRetryAfterMs(retryAfter, attempt, nowFn);
		stderr.write(
			`${operation} rate-limited (HTTP 429); retrying in ${Math.ceil(delayMs / 1000)}s (attempt ${attempt + 1}/${maxRetries}).\n`,
		);
		await sleepFn(delayMs);
	}
}

/**
 * Request a GitHub Actions OIDC JWT for the Currents audience.
 *
 * @param {{
 *   requestUrl: string,
 *   requestToken: string,
 *   fetchFn?: typeof fetch,
 *   stdout?: { write(chunk: string): unknown },
 * }} options
 * @returns {Promise<string>}
 */
export async function requestGithubOidcToken({
	requestUrl,
	requestToken,
	fetchFn = globalThis.fetch,
	stdout = process.stdout,
}) {
	const oidcUrl = new URL(requestUrl);
	oidcUrl.searchParams.set('audience', OIDC_AUDIENCE);

	let response;
	try {
		response = await fetchFn(oidcUrl.toString(), {
			method: 'GET',
			headers: {
				Authorization: `bearer ${requestToken}`,
				Accept: 'application/json',
			},
		});
	} catch {
		throw new Error('GitHub OIDC token request failed due to a network error');
	}

	if (!response.ok) {
		throw new Error(`GitHub OIDC token request failed (HTTP ${response.status})`);
	}

	/** @type {{ value?: unknown }} */
	let data;
	try {
		data = /** @type {{ value?: unknown }} */ (await response.json());
	} catch {
		throw new Error('GitHub OIDC token response was not valid JSON');
	}

	const jwt = typeof data?.value === 'string' ? data.value.trim() : '';
	if (!jwt) {
		throw new Error('GitHub OIDC token response did not include a token value');
	}

	assertSingleLine(jwt, 'GitHub OIDC token');
	maskValue(jwt, stdout);
	return jwt;
}

/**
 * Exchange a GitHub OIDC JWT for a short-lived Currents record key.
 *
 * @param {{
 *   oidcToken: string,
 *   policyId: string,
 *   fetchFn?: typeof fetch,
 *   sleepFn?: (ms: number) => Promise<void>,
 *   nowFn?: () => number,
 *   stdout?: { write(chunk: string): unknown },
 *   stderr?: { write(chunk: string): unknown },
 *   maxRetries?: number,
 *   tokenUrl?: string,
 * }} options
 * @returns {Promise<{ accessToken: string, expiresIn?: number }>}
 */
export async function exchangeOidcToken({
	oidcToken,
	policyId,
	fetchFn = globalThis.fetch,
	sleepFn = defaultSleep,
	nowFn = Date.now,
	stdout = process.stdout,
	stderr = process.stderr,
	maxRetries = DEFAULT_MAX_429_RETRIES,
	tokenUrl = CURRENTS_OIDC_TOKEN_URL,
}) {
	const body = new URLSearchParams({
		grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
		subject_token: oidcToken,
		subject_token_type: JWT_TOKEN_TYPE,
		policy_id: policyId,
	}).toString();

	const response = await fetchWithRateLimitRetry(
		tokenUrl,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			body,
		},
		{
			fetchFn,
			sleepFn,
			nowFn,
			stderr,
			maxRetries,
			operation: 'Currents OIDC token exchange',
		},
	);

	if (!response.ok) {
		throw new Error(`Currents OIDC token exchange failed (HTTP ${response.status})`);
	}

	/** @type {{ access_token?: unknown, expires_in?: unknown }} */
	let data;
	try {
		data = /** @type {{ access_token?: unknown, expires_in?: unknown }} */ (await response.json());
	} catch {
		throw new Error('Currents OIDC token exchange response was not valid JSON');
	}

	const accessToken = typeof data?.access_token === 'string' ? data.access_token.trim() : '';
	if (!accessToken) {
		throw new Error('Currents OIDC token exchange response did not include an access_token');
	}

	assertSingleLine(accessToken, 'Currents record key');
	maskValue(accessToken, stdout);

	return {
		accessToken,
		expiresIn: typeof data?.expires_in === 'number' ? data.expires_in : undefined,
	};
}

/**
 * Write CURRENTS_RECORD_KEY to $GITHUB_ENV after masking it.
 *
 * @param {string} recordKey
 * @param {{
 *   env?: NodeJS.ProcessEnv,
 *   stdout?: { write(chunk: string): unknown },
 *   appendFileFn?: typeof fs.appendFileSync,
 * }} options
 */
function exportRecordKey(
	recordKey,
	{ env = process.env, stdout = process.stdout, appendFileFn = fs.appendFileSync },
) {
	assertSingleLine(recordKey, 'Currents record key');
	maskValue(recordKey, stdout);
	if (env.GITHUB_ENV) {
		appendFileFn(env.GITHUB_ENV, `CURRENTS_RECORD_KEY=${recordKey}\n`, 'utf8');
	}
}

/**
 * Mint or fall back to a Currents record key and export it to $GITHUB_ENV.
 *
 * @param {{
 *   env?: NodeJS.ProcessEnv,
 *   fetchFn?: typeof fetch,
 *   sleepFn?: (ms: number) => Promise<void>,
 *   nowFn?: () => number,
 *   stdout?: { write(chunk: string): unknown },
 *   stderr?: { write(chunk: string): unknown },
 *   appendFileFn?: typeof fs.appendFileSync,
 *   maxRetries?: number,
 * }} [options]
 * @returns {Promise<{ mode: 'oidc' | 'fallback' | 'skip', exported: boolean, expiresIn?: number }>}
 */
export async function mintCurrentsRecordKey(options = {}) {
	const {
		env = process.env,
		fetchFn = globalThis.fetch,
		sleepFn = defaultSleep,
		nowFn = Date.now,
		stdout = process.stdout,
		stderr = process.stderr,
		appendFileFn = fs.appendFileSync,
		maxRetries = DEFAULT_MAX_429_RETRIES,
	} = options;

	const policyId = env.CURRENTS_OIDC_POLICY_ID?.trim() ?? '';
	if (!policyId) {
		const fallbackKey = env.FALLBACK_CURRENTS_RECORD_KEY?.trim() ?? '';
		if (!fallbackKey) {
			stdout.write(
				'CURRENTS_OIDC_POLICY_ID and FALLBACK_CURRENTS_RECORD_KEY are unset; skipping Currents recording.\n',
			);
			return { mode: 'skip', exported: false };
		}

		exportRecordKey(fallbackKey, { env, stdout, appendFileFn });
		stdout.write('CURRENTS_OIDC_POLICY_ID is unset; exported fallback CURRENTS_RECORD_KEY.\n');
		return { mode: 'fallback', exported: true };
	}

	const requestUrl = env.ACTIONS_ID_TOKEN_REQUEST_URL?.trim() ?? '';
	if (!requestUrl) {
		stdout.write('ACTIONS_ID_TOKEN_REQUEST_URL is unset; skipping Currents OIDC token exchange.\n');
		return { mode: 'skip', exported: false };
	}

	const requestToken = env.ACTIONS_ID_TOKEN_REQUEST_TOKEN?.trim() ?? '';
	if (!requestToken) {
		throw new Error(
			'ACTIONS_ID_TOKEN_REQUEST_TOKEN is missing while ACTIONS_ID_TOKEN_REQUEST_URL is set',
		);
	}

	const oidcToken = await requestGithubOidcToken({
		requestUrl,
		requestToken,
		fetchFn,
		stdout,
	});

	const { accessToken, expiresIn } = await exchangeOidcToken({
		oidcToken,
		policyId,
		fetchFn,
		sleepFn,
		nowFn,
		stdout,
		stderr,
		maxRetries,
	});

	if (env.GITHUB_ENV) {
		appendFileFn(env.GITHUB_ENV, `CURRENTS_RECORD_KEY=${accessToken}\n`, 'utf8');
	}

	const expiryNote = typeof expiresIn === 'number' ? ` (expires in ${expiresIn}s)` : '';
	stdout.write(`Exported short-lived Currents OIDC record key${expiryNote}.\n`);
	return { mode: 'oidc', exported: true, expiresIn };
}

/**
 * Revoke an OIDC-issued Currents record key. Non-OIDC keys (without the
 * crnts_ci_ prefix) are never revoked.
 *
 * @param {{
 *   env?: NodeJS.ProcessEnv,
 *   fetchFn?: typeof fetch,
 *   sleepFn?: (ms: number) => Promise<void>,
 *   nowFn?: () => number,
 *   stdout?: { write(chunk: string): unknown },
 *   stderr?: { write(chunk: string): unknown },
 *   maxRetries?: number,
 *   revokeUrl?: string,
 * }} [options]
 * @returns {Promise<{ revoked: boolean, reason?: 'missing' | 'not-oidc' }>}
 */
export async function revokeCurrentsRecordKey(options = {}) {
	const {
		env = process.env,
		fetchFn = globalThis.fetch,
		sleepFn = defaultSleep,
		nowFn = Date.now,
		stdout = process.stdout,
		stderr = process.stderr,
		maxRetries = 2,
		revokeUrl = CURRENTS_OIDC_REVOKE_URL,
	} = options;

	const recordKey = env.CURRENTS_RECORD_KEY?.trim() ?? '';
	if (!recordKey) {
		stdout.write('CURRENTS_RECORD_KEY is unset; skipping revoke.\n');
		return { revoked: false, reason: 'missing' };
	}

	if (!recordKey.startsWith(OIDC_KEY_PREFIX)) {
		stdout.write('CURRENTS_RECORD_KEY is not an OIDC-issued key; skipping revoke.\n');
		return { revoked: false, reason: 'not-oidc' };
	}

	const body = new URLSearchParams({
		token: recordKey,
		token_type_hint: 'access_token',
	}).toString();

	const response = await fetchWithRateLimitRetry(
		revokeUrl,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body,
		},
		{
			fetchFn,
			sleepFn,
			nowFn,
			stderr,
			maxRetries,
			operation: 'Currents OIDC token revocation',
		},
	);

	if (!response.ok) {
		throw new Error(`Currents OIDC token revocation failed (HTTP ${response.status})`);
	}

	stdout.write('Revoked short-lived Currents OIDC record key.\n');
	return { revoked: true };
}

/**
 * Cancel a Currents run using the record key, project ID, and CI build ID.
 *
 * @param {{
 *   env?: NodeJS.ProcessEnv,
 *   fetchFn?: typeof fetch,
 *   stdout?: { write(chunk: string): unknown },
 *   cancelUrl?: string,
 * }} [options]
 * @returns {Promise<{ cancelled: boolean, reason?: 'missing-env' }>}
 */
export async function cancelCurrentsRun(options = {}) {
	const {
		env = process.env,
		fetchFn = globalThis.fetch,
		stdout = process.stdout,
		cancelUrl = CURRENTS_CANCEL_RUN_URL,
	} = options;

	const recordKey = env.CURRENTS_RECORD_KEY?.trim() ?? '';
	const projectId = env.CURRENTS_PROJECT_ID?.trim() ?? '';
	const ciBuildId = env.CURRENTS_CI_BUILD_ID?.trim() ?? '';

	if (!recordKey || !projectId || !ciBuildId) {
		stdout.write(
			'Skipping Currents run cancellation (CURRENTS_RECORD_KEY, CURRENTS_PROJECT_ID, or CURRENTS_CI_BUILD_ID is unset).\n',
		);
		return { cancelled: false, reason: 'missing-env' };
	}

	const response = await fetchFn(cancelUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({ recordKey, projectId, ciBuildId }),
	});

	if (!response.ok) {
		throw new Error(`Currents run cancellation failed (HTTP ${response.status})`);
	}

	stdout.write('Cancelled Currents run.\n');
	return { cancelled: true };
}

/**
 * CLI entry point. Returns a process exit code.
 *
 * @param {string[]} argv
 * @param {{
 *   env?: NodeJS.ProcessEnv,
 *   fetchFn?: typeof fetch,
 *   sleepFn?: (ms: number) => Promise<void>,
 *   nowFn?: () => number,
 *   stdout?: { write(chunk: string): unknown },
 *   stderr?: { write(chunk: string): unknown },
 *   appendFileFn?: typeof fs.appendFileSync,
 * }} [options]
 * @returns {Promise<number>}
 */
export async function main(argv, options = {}) {
	const stderr = options.stderr ?? process.stderr;
	const [command] = argv;

	switch (command) {
		case 'mint':
			try {
				await mintCurrentsRecordKey(options);
				return 0;
			} catch (error) {
				stderr.write(`::error::${error instanceof Error ? error.message : String(error)}\n`);
				return 1;
			}
		case 'revoke':
			try {
				await revokeCurrentsRecordKey(options);
			} catch (error) {
				stderr.write(`::warning::${error instanceof Error ? error.message : String(error)}\n`);
			}
			return 0;
		case 'cancel':
			try {
				await cancelCurrentsRun(options);
			} catch (error) {
				stderr.write(`::warning::${error instanceof Error ? error.message : String(error)}\n`);
			}
			return 0;
		default:
			stderr.write('Usage: node .github/scripts/currents-oidc.mjs <mint|revoke|cancel>\n');
			return 1;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main(process.argv.slice(2)).then(
		(code) => {
			process.exitCode = code;
		},
		(error) => {
			process.stderr.write(`::error::${error instanceof Error ? error.message : String(error)}\n`);
			process.exitCode = 1;
		},
	);
}
