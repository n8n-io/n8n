import { parseLatencyArgs } from '../args';

describe('parseLatencyArgs', () => {
	it('parses a run with defaults', () => {
		expect(parseLatencyArgs(['--label', 'baseline'])).toEqual({
			mode: 'run',
			label: 'baseline',
			outDir: '.output/latency',
			repeat: 4,
			baseUrl: 'http://localhost:5678',
			timeoutMs: 600_000,
		});
	});

	it('parses run overrides', () => {
		expect(
			parseLatencyArgs([
				'--label',
				'prewarm',
				'--out',
				'/tmp/latency',
				'--repeat',
				'2',
				'--base-url',
				'http://localhost:5679',
				'--timeout-ms',
				'300000',
			]),
		).toEqual({
			mode: 'run',
			label: 'prewarm',
			outDir: '/tmp/latency',
			repeat: 2,
			baseUrl: 'http://localhost:5679',
			timeoutMs: 300_000,
		});
	});

	it('parses a comparison of two run files', () => {
		expect(parseLatencyArgs(['--compare', 'a.jsonl', 'b.jsonl'])).toEqual({
			mode: 'compare',
			fileA: 'a.jsonl',
			fileB: 'b.jsonl',
		});
	});

	it('rejects a run without a label', () => {
		expect(() => parseLatencyArgs([])).toThrow('--label');
	});

	it('rejects a comparison without two files', () => {
		expect(() => parseLatencyArgs(['--compare', 'a.jsonl'])).toThrow('--compare');
	});

	it('rejects a repeat count below one', () => {
		expect(() => parseLatencyArgs(['--label', 'x', '--repeat', '0'])).toThrow();
	});
});
