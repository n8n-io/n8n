import {
	createTemplateTelemetrySession,
	extractGrepQuery,
	type TelemetrySessionOptions,
} from './template-telemetry';
import type { OrchestrationContext } from '../types';

function makeOpts(): {
	opts: TelemetrySessionOptions;
	calls: Array<{ name: string; props: Record<string, unknown> }>;
} {
	const calls: Array<{ name: string; props: Record<string, unknown> }> = [];
	const context = {
		trackTelemetry: (name: string, props: Record<string, unknown>) => {
			calls.push({ name, props });
		},
	} as unknown as OrchestrationContext;
	return {
		opts: {
			context,
			threadId: 'thread-1',
			runId: 'run-42',
			workItemId: 'wi_abc12345',
			userRequestExcerpt: 'summarise emails to slack daily',
		},
		calls,
	};
}

describe('createTemplateTelemetrySession', () => {
	it('emits a search event when grep targets examples/index.txt', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observe(
			'grep -i "slack" /home/sandbox/workspace/examples/index.txt',
			'slack-daily-summary.ts | Daily Slack ...\nother.ts | ...\n',
		);

		const search = calls.find((c) => c.name === 'Builder template search');
		expect(search).toBeDefined();
		expect(search!.props.query).toBe('slack');
		expect(search!.props.result_count).toBe(2);
		expect(search!.props.run_id).toBe('run-42');
		expect(search!.props.work_item_id).toBe('wi_abc12345');
	});

	it('does not emit search for grep against a different file', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observe('grep -i "gmail" /workspace/node-types/index.txt', 'something\n');
		expect(calls.find((c) => c.name === 'Builder template search')).toBeUndefined();
	});

	it('emits a read event when cat targets examples/<file>.ts', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observe(
			'cat /home/sandbox/workspace/examples/slack-daily-summary.ts',
			'/* file content here */',
		);

		const read = calls.find((c) => c.name === 'Builder template read');
		expect(read).toBeDefined();
		expect(read!.props.template_filename).toBe('slack-daily-summary.ts');
		expect(read!.props.bytes_read).toBe('/* file content here */'.length);
	});

	it('handles head/sed/less/more in addition to cat', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observe('head -50 /workspace/examples/slack-daily-summary.ts', 'lines');
		session.observe('sed -n 1,30p /workspace/examples/build-your-first-ai-agent-6270.ts', 'lines');

		const reads = calls.filter((c) => c.name === 'Builder template read');
		expect(reads.length).toBe(2);
	});

	it('does not emit a read for cat on a non-template file', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observe('cat /workspace/src/workflow.ts', 'content');
		expect(calls.find((c) => c.name === 'Builder template read')).toBeUndefined();
	});

	it('emits a session rollup on flush', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observe('grep -i "slack" /workspace/examples/index.txt', 'a\nb\n');
		session.observe('cat /workspace/examples/slack-daily-summary.ts', 'X');
		session.observe('cat /workspace/examples/slack-daily-summary.ts', 'X');
		session.flush();

		const rollup = calls.find((c) => c.name === 'Builder template session');
		expect(rollup).toBeDefined();
		expect(rollup!.props.search_count).toBe(1);
		expect(rollup!.props.read_count).toBe(2);
		expect(rollup!.props.unique_templates_read).toBe(1);
		expect(rollup!.props.user_request_excerpt).toBe('summarise emails to slack daily');
	});

	it('truncates user_request_excerpt to 120 chars', () => {
		const long = 'a'.repeat(200);
		const { opts, calls } = makeOpts();
		opts.userRequestExcerpt = long;
		const session = createTemplateTelemetrySession(opts);
		session.flush();
		const rollup = calls.find((c) => c.name === 'Builder template session');
		expect(rollup!.props.user_request_excerpt).toHaveLength(120);
	});

	it('flush is idempotent and stops further events', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.flush();
		session.observe('cat /workspace/examples/foo.ts', 'X');
		session.flush();
		expect(calls.filter((c) => c.name === 'Builder template session').length).toBe(1);
		expect(calls.filter((c) => c.name === 'Builder template read').length).toBe(0);
	});

	it('sets user_request_excerpt to null when none provided', () => {
		const { opts, calls } = makeOpts();
		opts.userRequestExcerpt = undefined;
		const session = createTemplateTelemetrySession(opts);
		session.flush();
		const rollup = calls.find((c) => c.name === 'Builder template session');
		expect(rollup!.props.user_request_excerpt).toBeNull();
	});
});

describe('extractGrepQuery', () => {
	it('extracts double-quoted patterns', () => {
		expect(extractGrepQuery('grep -i "slack post" examples/index.txt')).toBe('slack post');
	});

	it('extracts single-quoted patterns', () => {
		expect(extractGrepQuery("grep -i 'gmail' examples/index.txt")).toBe('gmail');
	});

	it('extracts bare patterns when unquoted', () => {
		expect(extractGrepQuery('grep slack examples/index.txt')).toBe('slack');
		expect(extractGrepQuery('grep -i slack examples/index.txt')).toBe('slack');
	});

	it('caps the query at 200 characters', () => {
		const long = 'x'.repeat(300);
		const result = extractGrepQuery(`grep -i "${long}" examples/index.txt`);
		expect(result.length).toBe(200);
	});

	it('returns empty string when no pattern found', () => {
		expect(extractGrepQuery('grep')).toBe('');
	});
});
