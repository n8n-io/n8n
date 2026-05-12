import type { InstanceAiEvent } from '@n8n/api-types';

import {
	createTemplateTelemetrySession,
	createTypedToolObserver,
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

	it('redacts API keys and bearer tokens from user_request_excerpt', () => {
		const { opts, calls } = makeOpts();
		opts.userRequestExcerpt =
			'call openai with sk-proj-abcdef0123456789 and slack xoxb-1234567890-abcdef';
		const session = createTemplateTelemetrySession(opts);
		session.flush();
		const rollup = calls.find((c) => c.name === 'Builder template session');
		const excerpt = rollup!.props.user_request_excerpt as string;
		expect(excerpt).not.toContain('sk-proj-abcdef0123456789');
		expect(excerpt).not.toContain('xoxb-1234567890-abcdef');
		expect(excerpt).toContain('[REDACTED]');
	});

	it('redacts password=... assignments from user_request_excerpt', () => {
		const { opts, calls } = makeOpts();
		opts.userRequestExcerpt = 'connect to db with password=hunter2 and api_key=secret123';
		const session = createTemplateTelemetrySession(opts);
		session.flush();
		const rollup = calls.find((c) => c.name === 'Builder template session');
		const excerpt = rollup!.props.user_request_excerpt as string;
		expect(excerpt).not.toContain('hunter2');
		expect(excerpt).not.toContain('secret123');
		expect(excerpt).toContain('[REDACTED]');
	});

	it('leaves normal English prompts unchanged', () => {
		const { opts, calls } = makeOpts();
		opts.userRequestExcerpt = 'summarise emails to slack daily';
		const session = createTemplateTelemetrySession(opts);
		session.flush();
		const rollup = calls.find((c) => c.name === 'Builder template session');
		expect(rollup!.props.user_request_excerpt).toBe('summarise emails to slack daily');
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

describe('observeTypedRead / observeTypedSearch', () => {
	it('observeTypedRead emits a read event with filename and bytes', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observeTypedRead('slack-daily-summary.ts', 1234);

		const read = calls.find((c) => c.name === 'Builder template read');
		expect(read).toBeDefined();
		expect(read!.props.template_filename).toBe('slack-daily-summary.ts');
		expect(read!.props.bytes_read).toBe(1234);
		expect(read!.props.run_id).toBe('run-42');
		expect(read!.props.work_item_id).toBe('wi_abc12345');
	});

	it('observeTypedSearch emits a search event with query and result count', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observeTypedSearch('slack', 5);

		const search = calls.find((c) => c.name === 'Builder template search');
		expect(search).toBeDefined();
		expect(search!.props.query).toBe('slack');
		expect(search!.props.result_count).toBe(5);
	});

	it('typed observations contribute to the session rollup', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observeTypedSearch('slack', 3);
		session.observeTypedRead('slack-daily-summary.ts', 100);
		session.observeTypedRead('slack-daily-summary.ts', 50);
		session.flush();

		const rollup = calls.find((c) => c.name === 'Builder template session');
		expect(rollup!.props.search_count).toBe(1);
		expect(rollup!.props.read_count).toBe(2);
		expect(rollup!.props.unique_templates_read).toBe(1);
	});

	it('typed methods are no-ops after flush', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.flush();
		session.observeTypedRead('foo.ts', 10);
		session.observeTypedSearch('foo', 1);
		expect(calls.filter((c) => c.name === 'Builder template read')).toHaveLength(0);
		expect(calls.filter((c) => c.name === 'Builder template search')).toHaveLength(0);
	});

	it('truncates typed search query to the query cap', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observeTypedSearch('x'.repeat(300), 1);

		const search = calls.find((c) => c.name === 'Builder template search');
		expect(typeof search!.props.query).toBe('string');
		expect((search!.props.query as string).length).toBe(200);
	});

	it('redacts secrets from typed search query before emit', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observeTypedSearch('Bearer abcdef0123456789ABCDEF and password=hunter2', 1);

		const search = calls.find((c) => c.name === 'Builder template search');
		const query = search!.props.query as string;
		expect(query).not.toContain('abcdef0123456789ABCDEF');
		expect(query).not.toContain('hunter2');
		expect(query).toContain('[REDACTED]');
	});

	it('redacts secrets from grep-derived search query before emit', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		session.observe(
			'grep -i "sk-proj-abcdef0123456789xyz" /workspace/examples/index.txt',
			'nothing\n',
		);

		const search = calls.find((c) => c.name === 'Builder template search');
		const query = search!.props.query as string;
		expect(query).not.toContain('sk-proj-abcdef0123456789xyz');
		expect(query).toContain('[REDACTED]');
	});
});

describe('createTypedToolObserver', () => {
	function toolCall(
		toolCallId: string,
		toolName: string,
		args: Record<string, unknown>,
	): InstanceAiEvent {
		return {
			type: 'tool-call',
			runId: 'run-42',
			agentId: 'agent-1',
			payload: { toolCallId, toolName, args },
		};
	}
	function toolResult(toolCallId: string, result: unknown): InstanceAiEvent {
		return {
			type: 'tool-result',
			runId: 'run-42',
			agentId: 'agent-1',
			payload: { toolCallId, result },
		};
	}
	function toolError(toolCallId: string, error: string): InstanceAiEvent {
		return {
			type: 'tool-error',
			runId: 'run-42',
			agentId: 'agent-1',
			payload: { toolCallId, error },
		};
	}

	it('emits typed read for mastra_workspace_read_file targeting examples/<slug>.ts', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		const observe = createTypedToolObserver(session);

		observe(
			toolCall('tc-1', 'mastra_workspace_read_file', {
				path: '/workspace/examples/slack-daily-summary.ts',
			}),
		);
		observe(
			toolResult(
				'tc-1',
				'/workspace/examples/slack-daily-summary.ts (200 bytes)\nfile content here\n',
			),
		);

		const read = calls.find((c) => c.name === 'Builder template read');
		expect(read).toBeDefined();
		expect(read!.props.template_filename).toBe('slack-daily-summary.ts');
		expect(read!.props.bytes_read).toBeGreaterThan(0);
	});

	it('emits typed search for mastra_workspace_grep targeting examples/', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		const observe = createTypedToolObserver(session);

		observe(toolCall('tc-2', 'mastra_workspace_grep', { pattern: 'slack', path: 'examples/' }));
		observe(toolResult('tc-2', 'examples/a.ts:1:1: slack\nexamples/b.ts:5:1: slack\n'));

		const search = calls.find((c) => c.name === 'Builder template search');
		expect(search).toBeDefined();
		expect(search!.props.query).toBe('slack');
		expect(search!.props.result_count).toBe(2);
	});

	it('emits typed search for grep targeting examples/index.txt', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		const observe = createTypedToolObserver(session);

		observe(
			toolCall('tc-3', 'mastra_workspace_grep', { pattern: 'slack', path: 'examples/index.txt' }),
		);
		observe(toolResult('tc-3', 'slack-daily.ts | Daily Slack\nslack-onboard.ts | Onboard\n'));

		const search = calls.find((c) => c.name === 'Builder template search');
		expect(search!.props.result_count).toBe(2);
	});

	it('ignores read_file outside examples/', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		const observe = createTypedToolObserver(session);

		observe(toolCall('tc-x', 'mastra_workspace_read_file', { path: '/workspace/src/workflow.ts' }));
		observe(toolResult('tc-x', 'content'));

		expect(calls.find((c) => c.name === 'Builder template read')).toBeUndefined();
	});

	it('ignores grep that does not target examples/', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		const observe = createTypedToolObserver(session);

		observe(toolCall('tc-y', 'mastra_workspace_grep', { pattern: 'foo', path: 'src/' }));
		observe(toolResult('tc-y', 'src/a.ts:1:1: foo\n'));

		expect(calls.find((c) => c.name === 'Builder template search')).toBeUndefined();
	});

	it('ignores unrelated tools', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		const observe = createTypedToolObserver(session);

		observe(
			toolCall('tc-z', 'mastra_workspace_write_file', { path: 'examples/foo.ts', content: 'x' }),
		);
		observe(toolResult('tc-z', 'ok'));

		expect(calls.find((c) => c.name === 'Builder template read')).toBeUndefined();
		expect(calls.find((c) => c.name === 'Builder template search')).toBeUndefined();
	});

	it('does not emit on tool-error and clears pending state', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		const observe = createTypedToolObserver(session);

		observe(toolCall('tc-e', 'mastra_workspace_read_file', { path: 'examples/foo.ts' }));
		observe(toolError('tc-e', 'permission denied'));

		expect(calls.find((c) => c.name === 'Builder template read')).toBeUndefined();
	});

	it('handles non-string results gracefully (no emission)', () => {
		const { opts, calls } = makeOpts();
		const session = createTemplateTelemetrySession(opts);
		const observe = createTypedToolObserver(session);

		observe(toolCall('tc-n', 'mastra_workspace_read_file', { path: 'examples/foo.ts' }));
		observe(toolResult('tc-n', { not: 'a string' }));

		expect(calls.find((c) => c.name === 'Builder template read')).toBeUndefined();
	});
});
