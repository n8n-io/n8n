import { describe, expect, it } from 'vitest';

import { parsePromText, readFirstAvailable, readSum, readSumWhere, readValue } from '../prom';

// Shaped after a real n8n /metrics scrape (prefix `n8n_`, prom-client 15.x).
const SCRAPE = `
# HELP n8n_nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.
# TYPE n8n_nodejs_heap_size_used_bytes gauge
n8n_nodejs_heap_size_used_bytes 123456789

# HELP n8n_process_resident_memory_bytes Resident memory size in bytes.
# TYPE n8n_process_resident_memory_bytes gauge
n8n_process_resident_memory_bytes 987654321

# HELP n8n_instance_ai_active_runs Number of currently active Instance AI runs.
# TYPE n8n_instance_ai_active_runs gauge
n8n_instance_ai_active_runs 7

# HELP n8n_instance_ai_runs_total Total Instance AI runs.
# TYPE n8n_instance_ai_runs_total counter
n8n_instance_ai_runs_total{status="success",model="anthropic/claude-opus-4-8"} 12
n8n_instance_ai_runs_total{status="error",model="anthropic/claude-opus-4-8"} 3

# HELP n8n_instance_ai_tokens_total Tokens consumed.
# TYPE n8n_instance_ai_tokens_total counter
n8n_instance_ai_tokens_total{type="input"} 400000
n8n_instance_ai_tokens_total{type="output"} 25000

# HELP n8n_nodejs_gc_duration_seconds GC duration.
# TYPE n8n_nodejs_gc_duration_seconds histogram
n8n_nodejs_gc_duration_seconds_bucket{le="0.001",kind="minor"} 40
n8n_nodejs_gc_duration_seconds_bucket{le="+Inf",kind="minor"} 42
n8n_nodejs_gc_duration_seconds_sum{kind="minor"} 0.0512
n8n_nodejs_gc_duration_seconds_count{kind="minor"} 42
n8n_nodejs_gc_duration_seconds_count{kind="major"} 5

# HELP n8n_nodejs_eventloop_lag_p99_seconds Lag p99.
# TYPE n8n_nodejs_eventloop_lag_p99_seconds gauge
n8n_nodejs_eventloop_lag_p99_seconds 0.0134
`;

describe('parsePromText', () => {
	const snapshot = parsePromText(SCRAPE);

	it('parses an unlabelled gauge', () => {
		expect(readValue(snapshot, 'n8n_nodejs_heap_size_used_bytes')).toBe(123456789);
		expect(readValue(snapshot, 'n8n_instance_ai_active_runs')).toBe(7);
	});

	it('skips HELP, TYPE and blank lines', () => {
		expect(snapshot.has('#')).toBe(false);
		expect(snapshot.has('HELP')).toBe(false);
		expect([...snapshot.keys()]).not.toContain('');
	});

	it('keeps every label set of a series', () => {
		const samples = snapshot.get('n8n_instance_ai_runs_total');
		expect(samples).toHaveLength(2);
		expect(samples?.[0].labels).toEqual({
			status: 'success',
			model: 'anthropic/claude-opus-4-8',
		});
	});

	it('parses histogram _sum, _count and _bucket as distinct series', () => {
		expect(readValue(snapshot, 'n8n_nodejs_gc_duration_seconds_sum')).toBeCloseTo(0.0512);
		expect(readSum(snapshot, 'n8n_nodejs_gc_duration_seconds_count')).toBe(47);
		expect(snapshot.get('n8n_nodejs_gc_duration_seconds_bucket')).toHaveLength(2);
	});

	it('parses +Inf, -Inf and NaN values', () => {
		const parsed = parsePromText(['a_inf +Inf', 'a_neg_inf -Inf', 'a_nan NaN'].join('\n'));
		expect(readValue(parsed, 'a_inf')).toBe(Number.POSITIVE_INFINITY);
		expect(readValue(parsed, 'a_neg_inf')).toBe(Number.NEGATIVE_INFINITY);
		expect(readValue(parsed, 'a_nan')).toBeNaN();
	});

	it('ignores a trailing timestamp', () => {
		const parsed = parsePromText('a_metric 42 1700000000000');
		expect(readValue(parsed, 'a_metric')).toBe(42);
	});

	it('handles label values containing commas, spaces, braces and escaped quotes', () => {
		const parsed = parsePromText('a_metric{path="/rest/a, b",note="say \\"hi\\"",brace="}"} 5');
		const sample = parsed.get('a_metric')?.[0];
		expect(sample?.labels).toEqual({ path: '/rest/a, b', note: 'say "hi"', brace: '}' });
		expect(sample?.value).toBe(5);
	});

	it('skips malformed lines instead of throwing', () => {
		const parsed = parsePromText(
			['garbage_without_value', 'a_metric{unclosed="x" 1', 'good_metric 3'].join('\n'),
		);
		expect(readValue(parsed, 'good_metric')).toBe(3);
		expect(readValue(parsed, 'garbage_without_value')).toBeNull();
	});
});

describe('readers', () => {
	const snapshot = parsePromText(SCRAPE);

	it('returns null — not 0 — for an absent series, so renames stay visible', () => {
		expect(readValue(snapshot, 'n8n_does_not_exist')).toBeNull();
		expect(readSum(snapshot, 'n8n_does_not_exist')).toBeNull();
		expect(readSumWhere(snapshot, 'n8n_does_not_exist', {})).toBeNull();
	});

	it('readSum totals every label set', () => {
		expect(readSum(snapshot, 'n8n_instance_ai_runs_total')).toBe(15);
	});

	it('readSumWhere filters on a label subset', () => {
		expect(readSumWhere(snapshot, 'n8n_instance_ai_tokens_total', { type: 'input' })).toBe(400000);
		expect(readSumWhere(snapshot, 'n8n_instance_ai_runs_total', { status: 'success' })).toBe(12);
	});

	it('readSumWhere returns null when no label set matches', () => {
		expect(readSumWhere(snapshot, 'n8n_instance_ai_tokens_total', { type: 'nope' })).toBeNull();
	});

	it('readFirstAvailable falls through to the first present candidate', () => {
		expect(
			readFirstAvailable(snapshot, [
				'n8n_nodejs_eventloop_lag_p99_seconds_renamed',
				'n8n_nodejs_eventloop_lag_p99_seconds',
			]),
		).toBeCloseTo(0.0134);
		expect(readFirstAvailable(snapshot, ['nope_a', 'nope_b'])).toBeNull();
	});
});
