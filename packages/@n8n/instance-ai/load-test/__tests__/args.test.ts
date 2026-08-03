import { describe, expect, it } from 'vitest';

import { MAX_USERS, parseArgs, parseDuration } from '../args';

const EMPTY_ENV: NodeJS.ProcessEnv = {};

describe('parseArgs', () => {
	it('applies defaults with no flags', () => {
		const args = parseArgs([], EMPTY_ENV);
		expect(args.userCounts).toEqual([5]);
		expect(args.baseUrl).toBe('http://localhost:5678');
		expect(args.maxTurns).toBe(4);
		expect(args.maxCostUsd).toBe(5);
		expect(args.dryRun).toBe(false);
	});

	it('reads --users and --base-url', () => {
		const args = parseArgs(['--users', '10', '--base-url', 'http://n8n.test:5679'], EMPTY_ENV);
		expect(args.userCounts).toEqual([10]);
		expect(args.baseUrl).toBe('http://n8n.test:5679');
	});

	it('rejects a user count outside 1..MAX_USERS', () => {
		expect(() => parseArgs(['--users', '0'], EMPTY_ENV)).toThrow(/Invalid arguments/);
		expect(() => parseArgs(['--users', String(MAX_USERS + 1)], EMPTY_ENV)).toThrow(
			/Invalid arguments/,
		);
		expect(() => parseArgs(['--users', String(MAX_USERS)], EMPTY_ENV)).not.toThrow();
	});

	it('parses --sweep into ordered concurrency levels', () => {
		expect(parseArgs(['--sweep', '1,5,10'], EMPTY_ENV).userCounts).toEqual([1, 5, 10]);
		expect(parseArgs(['--sweep', ' 2 , 4 '], EMPTY_ENV).userCounts).toEqual([2, 4]);
	});

	it('refuses --users together with --sweep', () => {
		expect(() => parseArgs(['--users', '5', '--sweep', '1,5'], EMPTY_ENV)).toThrow(
			/either --users or --sweep/,
		);
	});

	it('parses --cases into a list', () => {
		expect(parseArgs(['--cases', 'a,b , c'], EMPTY_ENV).caseNames).toEqual(['a', 'b', 'c']);
		expect(parseArgs([], EMPTY_ENV).caseNames).toBeUndefined();
	});

	it('accepts duration units on duration flags', () => {
		const args = parseArgs(
			['--ramp', '30s', '--max-wall-clock', '5m', '--sample-interval', '1500ms'],
			EMPTY_ENV,
		);
		expect(args.rampMs).toBe(30_000);
		expect(args.maxWallClockMs).toBe(300_000);
		expect(args.sampleIntervalMs).toBe(1_500);
	});

	it('allows --ramp 0 for a deliberate thundering herd', () => {
		expect(parseArgs(['--ramp', '0'], EMPTY_ENV).rampMs).toBe(0);
	});

	it('falls back to the eval env vars for owner credentials', () => {
		const args = parseArgs([], { N8N_EVAL_EMAIL: 'owner@n8n.io', N8N_EVAL_PASSWORD: 'pw' });
		expect(args.ownerEmail).toBe('owner@n8n.io');
		expect(args.ownerPassword).toBe('pw');
	});

	it('prefers explicit flags over env vars', () => {
		const args = parseArgs(['--email', 'flag@n8n.io'], { N8N_EVAL_EMAIL: 'env@n8n.io' });
		expect(args.ownerEmail).toBe('flag@n8n.io');
	});

	it('collects boolean switches', () => {
		const args = parseArgs(
			['--dry-run', '--no-metrics', '--heap-snapshots', '--keep-workflows', '-v', '-y'],
			EMPTY_ENV,
		);
		expect(args).toMatchObject({
			dryRun: true,
			noMetrics: true,
			heapSnapshots: true,
			keepWorkflows: true,
			verbose: true,
			yes: true,
		});
	});

	it('refuses to delete users it did not create', () => {
		expect(() => parseArgs(['--delete-users', '--users-file', 'u.json'], EMPTY_ENV)).toThrow(
			/--delete-users refuses/,
		);
	});

	it('rejects a non-URL base URL', () => {
		expect(() => parseArgs(['--base-url', 'not-a-url'], EMPTY_ENV)).toThrow(/Invalid arguments/);
	});

	describe('secret hygiene', () => {
		it('does not echo the value of an unknown flag', () => {
			expect(() => parseArgs(['--totally-unknown=sk-ant-supersecret'], EMPTY_ENV)).toThrow(
				'Unknown flag: --totally-unknown',
			);
		});

		it('does not echo a bad value for a known flag', () => {
			// A shell mis-expansion could put a token here; the message must stay generic.
			expect(() => parseArgs(['--max-turns', 'sk-ant-secret'], EMPTY_ENV)).toThrow(
				'Invalid integer for --max-turns',
			);
			expect(() => parseArgs(['--ramp', 'sk-ant-secret'], EMPTY_ENV)).toThrow(
				/Invalid duration for --ramp/,
			);
		});

		it('rejects a positional argument without echoing it', () => {
			expect(() => parseArgs(['sk-ant-secret'], EMPTY_ENV)).toThrow(
				'Unexpected positional argument',
			);
		});

		it('reports validation failures by field, not by value', () => {
			let message = '';
			try {
				parseArgs(['--user-password', ''], EMPTY_ENV);
			} catch (error) {
				message = error instanceof Error ? error.message : String(error);
			}
			expect(message).toContain('userPassword');
		});
	});

	it('requires a value for a flag that takes one', () => {
		expect(() => parseArgs(['--users'], EMPTY_ENV)).toThrow('Missing value for --users');
		expect(() => parseArgs(['--users', '--verbose'], EMPTY_ENV)).toThrow(
			'Missing value for --users',
		);
	});
});

describe('parseDuration', () => {
	it.each([
		['500ms', 500],
		['5s', 5_000],
		['2m', 120_000],
		['1h', 3_600_000],
		['1.5s', 1_500],
		['750', 750],
		['0', 0],
	])('parses %s', (raw, expected) => {
		expect(parseDuration(raw, '--flag')).toBe(expected);
	});

	it.each(['', 'abc', '5x', '-5s', '5 s s'])('rejects %s', (raw) => {
		expect(() => parseDuration(raw, '--flag')).toThrow(/Invalid duration/);
	});
});
