import { vi } from 'vitest';

import { DEFAULT_MCP_BUILD_MODEL, parseCliArgs, partialIsolationWarning } from '../cli/args';

describe('parseCliArgs --base-url', () => {
	it('defaults to a single localhost URL when --base-url is not provided', () => {
		const args = parseCliArgs([]);
		expect(args.baseUrls).toEqual(['http://localhost:5678']);
	});

	it('accepts a single URL', () => {
		const args = parseCliArgs(['--base-url', 'http://localhost:5678']);
		expect(args.baseUrls).toEqual(['http://localhost:5678']);
	});

	it('splits comma-separated URLs into a list of lanes', () => {
		const args = parseCliArgs([
			'--base-url',
			'http://localhost:5678,http://localhost:5679,http://localhost:5680',
		]);
		expect(args.baseUrls).toEqual([
			'http://localhost:5678',
			'http://localhost:5679',
			'http://localhost:5680',
		]);
	});

	it('trims surrounding whitespace from each URL', () => {
		const args = parseCliArgs(['--base-url', ' http://localhost:5678 , http://localhost:5679 ']);
		expect(args.baseUrls).toEqual(['http://localhost:5678', 'http://localhost:5679']);
	});

	it('drops empty entries from a stray comma', () => {
		const args = parseCliArgs(['--base-url', 'http://localhost:5678,,http://localhost:5679']);
		expect(args.baseUrls).toEqual(['http://localhost:5678', 'http://localhost:5679']);
	});

	it('rejects a non-URL entry', () => {
		expect(() => parseCliArgs(['--base-url', 'http://localhost:5678,not-a-url'])).toThrow();
	});
});

describe('parseCliArgs --prebuilt-workflows', () => {
	it('is undefined by default', () => {
		expect(parseCliArgs([]).prebuiltWorkflows).toBeUndefined();
		expect(parseCliArgs([]).deletePrebuiltWorkflows).toBe(false);
	});

	it('accepts a path argument', () => {
		const args = parseCliArgs(['--prebuilt-workflows', './mcp-manifest.json']);
		expect(args.prebuiltWorkflows).toBe('./mcp-manifest.json');
	});

	it('throws when no value is provided', () => {
		expect(() => parseCliArgs(['--prebuilt-workflows'])).toThrow(/Missing value/);
	});

	it('accepts deleting prebuilt workflows when a manifest is provided', () => {
		const args = parseCliArgs([
			'--prebuilt-workflows',
			'./mcp-manifest.json',
			'--delete-prebuilt-workflows',
		]);
		expect(args.deletePrebuiltWorkflows).toBe(true);
	});

	it('rejects deleting prebuilt workflows without a manifest', () => {
		expect(() => parseCliArgs(['--delete-prebuilt-workflows'])).toThrow(
			/--delete-prebuilt-workflows requires --prebuilt-workflows/,
		);
	});

	it('rejects deleting and keeping workflows at the same time', () => {
		expect(() =>
			parseCliArgs([
				'--prebuilt-workflows',
				'./mcp-manifest.json',
				'--delete-prebuilt-workflows',
				'--keep-workflows',
			]),
		).toThrow(/--delete-prebuilt-workflows cannot be used with --keep-workflows/);
	});
});

describe('parseCliArgs --exclude', () => {
	it('is undefined by default', () => {
		expect(parseCliArgs([]).exclude).toBeUndefined();
	});

	it('accepts a single substring', () => {
		expect(parseCliArgs(['--exclude', 'cross-team']).exclude).toBe('cross-team');
	});

	it('accepts a comma-separated list as a single value', () => {
		const args = parseCliArgs(['--exclude', 'cross-team,deduplication']);
		expect(args.exclude).toBe('cross-team,deduplication');
	});
});

describe('parseCliArgs --baseline-prefix', () => {
	it('defaults to the instance-ai baseline prefix', () => {
		expect(parseCliArgs([]).baselinePrefix).toBe('instance-ai-baseline-');
	});

	it('appends the required trailing hyphen when missing', () => {
		// Anchors the prefix match to LangSmith's `-<suffix>` separator so it can't
		// catch unrelated experiment names (e.g. `mcp-baseline` vs `mcp-baseline2-`).
		expect(parseCliArgs(['--baseline-prefix', 'mcp-baseline']).baselinePrefix).toBe(
			'mcp-baseline-',
		);
	});

	it('leaves an existing trailing hyphen intact', () => {
		expect(parseCliArgs(['--baseline-prefix', 'mcp-baseline-']).baselinePrefix).toBe(
			'mcp-baseline-',
		);
	});
});

describe('partialIsolationWarning', () => {
	it('returns undefined when both are at their defaults (Instance AI run)', () => {
		expect(
			partialIsolationWarning('instance-ai-workflow-evals', 'instance-ai-baseline-'),
		).toBeUndefined();
	});

	it('returns undefined when both are overridden (isolated cohort)', () => {
		expect(
			partialIsolationWarning('instance-ai-mcp-workflow-evals', 'mcp-baseline-'),
		).toBeUndefined();
	});

	it('warns when only the dataset is overridden', () => {
		expect(
			partialIsolationWarning('instance-ai-mcp-workflow-evals', 'instance-ai-baseline-'),
		).toMatch(/Partial LangSmith isolation/);
	});

	it('warns when only the baseline prefix is overridden', () => {
		expect(partialIsolationWarning('instance-ai-workflow-evals', 'mcp-baseline-')).toMatch(
			/Partial LangSmith isolation/,
		);
	});
});

describe('parseCliArgs --source langtracer dataset isolation', () => {
	it('derives a suite-scoped dataset + baseline prefix by default', () => {
		const args = parseCliArgs(['--source', 'langtracer', '--suite', 'n8n-workflows']);
		expect(args.dataset).toBe('instance-ai-langtracer-n8n-workflows');
		expect(args.baselinePrefix).toBe('instance-ai-langtracer-n8n-workflows-baseline-');
	});

	it('does not derive in disk mode (defaults stay the shared cohort)', () => {
		const args = parseCliArgs([]);
		expect(args.dataset).toBe('instance-ai-workflow-evals');
		expect(args.baselinePrefix).toBe('instance-ai-baseline-');
	});

	it('lets explicit --dataset / --baseline-prefix win', () => {
		const args = parseCliArgs([
			'--source',
			'langtracer',
			'--suite',
			'n8n-workflows',
			'--dataset',
			'custom-ds',
			'--baseline-prefix',
			'custom-base-',
		]);
		expect(args.dataset).toBe('custom-ds');
		expect(args.baselinePrefix).toBe('custom-base-');
	});

	it('sanitizes the suite into the dataset name', () => {
		const args = parseCliArgs(['--source', 'langtracer', '--suite', 'My Suite!']);
		expect(args.dataset).toBe('instance-ai-langtracer-my-suite');
	});
});

describe('parseCliArgs --build-via-mcp', () => {
	beforeEach(() => {
		// --build-via-mcp is LangSmith-only; give every test in this suite a key
		// so the requirement doesn't drown out what each test actually asserts.
		vi.stubEnv('LANGSMITH_API_KEY', 'test-key');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('requires LANGSMITH_API_KEY (the direct loop does not support MCP builds)', () => {
		vi.stubEnv('LANGSMITH_API_KEY', '');
		expect(() => parseCliArgs(['--build-via-mcp'])).toThrow(/--build-via-mcp requires LangSmith/);
	});

	it('defaults to disabled with sensible build knobs', () => {
		vi.stubEnv('ANTHROPIC_MODEL', '');
		const args = parseCliArgs([]);
		expect(args.buildViaMcp).toBe(false);
		expect(args.mcpServerName).toBe('n8n-local');
		expect(args.buildModel).toBe(DEFAULT_MCP_BUILD_MODEL);
		expect(args.buildCwd).toBeUndefined();
		expect(args.buildMaxAttempts).toBe(3);
		expect(args.buildMcpTimeoutMs).toBe(120_000);
		expect(args.buildTimeoutMs).toBe(1_800_000);
	});

	it('enables the mode and parses the build knobs', () => {
		const args = parseCliArgs([
			'--build-via-mcp',
			'--mcp-server',
			'n8n-eval',
			'--build-cwd',
			'/tmp/mcp-workspace',
			'--build-max-attempts',
			'5',
			'--build-mcp-timeout-ms',
			'90000',
			'--build-timeout-ms',
			'600000',
		]);
		expect(args.buildViaMcp).toBe(true);
		expect(args.mcpServerName).toBe('n8n-eval');
		expect(args.buildCwd).toBe('/tmp/mcp-workspace');
		expect(args.buildMaxAttempts).toBe(5);
		expect(args.buildMcpTimeoutMs).toBe(90_000);
		expect(args.buildTimeoutMs).toBe(600_000);
	});

	it('allows --build-timeout-ms 0 to disable the build killer', () => {
		expect(parseCliArgs(['--build-via-mcp', '--build-timeout-ms', '0']).buildTimeoutMs).toBe(0);
	});

	it('reads the build model from ANTHROPIC_MODEL', () => {
		vi.stubEnv('ANTHROPIC_MODEL', 'claude-opus-4-5');
		expect(parseCliArgs(['--build-via-mcp']).buildModel).toBe('claude-opus-4-5');
	});

	it('pins the default model when ANTHROPIC_MODEL is unset, so builds never float', () => {
		vi.stubEnv('ANTHROPIC_MODEL', '');
		expect(parseCliArgs(['--build-via-mcp']).buildModel).toBe(DEFAULT_MCP_BUILD_MODEL);
	});

	it('treats a whitespace-only ANTHROPIC_MODEL as unset', () => {
		vi.stubEnv('ANTHROPIC_MODEL', '   ');
		expect(parseCliArgs(['--build-via-mcp']).buildModel).toBe(DEFAULT_MCP_BUILD_MODEL);
	});

	it('rejects the removed --build-model flag', () => {
		// The model is env-configured (ANTHROPIC_MODEL); the old flag must fail
		// loudly instead of parsing and being silently ignored.
		expect(() => parseCliArgs(['--build-model', 'claude-opus-4-5'])).toThrow(
			/Unknown flag: --build-model/,
		);
	});

	it.each([
		['--mcp-server', 'n8n-eval'],
		['--build-cwd', '/tmp/mcp-workspace'],
		['--build-max-attempts', '5'],
		['--build-mcp-timeout-ms', '90000'],
		['--build-timeout-ms', '600000'],
	])('rejects %s without --build-via-mcp instead of silently ignoring it', (flag, value) => {
		expect(() => parseCliArgs([flag, value])).toThrow(/only takes? effect with --build-via-mcp/);
	});

	it('lists every build-only flag passed without --build-via-mcp', () => {
		expect(() => parseCliArgs(['--mcp-server', 'n8n-eval', '--build-timeout-ms', '0'])).toThrow(
			/--mcp-server, --build-timeout-ms only take effect with --build-via-mcp/,
		);
	});

	it('works with multiple --base-url lanes (unlike --prebuilt-workflows)', () => {
		const args = parseCliArgs([
			'--build-via-mcp',
			'--base-url',
			'http://localhost:5678,http://localhost:5679',
		]);
		expect(args.buildViaMcp).toBe(true);
		expect(args.baseUrls).toHaveLength(2);
	});

	it('rejects combining --build-via-mcp with --prebuilt-workflows', () => {
		expect(() =>
			parseCliArgs(['--build-via-mcp', '--prebuilt-workflows', '/tmp/manifest.json']),
		).toThrow(/incompatible with --prebuilt-workflows/);
	});

	it('rejects --delete-prebuilt-workflows with --build-via-mcp', () => {
		expect(() => parseCliArgs(['--build-via-mcp', '--delete-prebuilt-workflows'])).toThrow(
			/applies to --prebuilt-workflows/,
		);
	});

	it('rejects a non-integer --build-max-attempts', () => {
		expect(() => parseCliArgs(['--build-max-attempts', 'lots'])).toThrow();
	});
});
