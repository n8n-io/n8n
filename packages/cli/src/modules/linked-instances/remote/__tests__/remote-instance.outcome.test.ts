import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
	StreamableHTTPClientTransport,
	StreamableHTTPError,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';

import { RemoteInstanceError } from '../remote-instance.errors';
import {
	readToolResult,
	remoteText,
	toRemoteError,
	type RemoteStep,
} from '../remote-instance.outcome';
import { getLoadedSdk, type McpSdk } from '../remote-instance.sdk';

vi.mock('../remote-instance.sdk', () => ({ getLoadedSdk: vi.fn() }));

const sdk: McpSdk = {
	Client,
	StreamableHTTPClientTransport,
	StreamableHTTPError,
	McpError,
	requestTimeoutCode: ErrorCode.RequestTimeout,
	connectionClosedCode: ErrorCode.ConnectionClosed,
};

const STEPS: RemoteStep[] = ['connect', 'list', 'call'];

const token = `test-token-${randomUUID()}`;

const text = (value: string) => ({ type: 'text', text: value });

const caught = (run: () => unknown): RemoteInstanceError => {
	try {
		run();
	} catch (error) {
		expect(error).toBeInstanceOf(RemoteInstanceError);
		return error as RemoteInstanceError;
	}
	throw new Error('Expected a RemoteInstanceError');
};

describe('toRemoteError', () => {
	beforeEach(() => {
		vi.mocked(getLoadedSdk).mockReturnValue(sdk);
	});

	it('returns a RemoteInstanceError unchanged', () => {
		const error = new RemoteInstanceError('mcp-disabled', 'Turned off');

		expect(toRemoteError(error, 'call', token)).toBe(error);
	});

	it.each(STEPS)('reports unreachable at %s before the SDK has loaded', (step) => {
		vi.mocked(getLoadedSdk).mockReturnValue(undefined);

		const error = toRemoteError(new McpError(ErrorCode.InvalidParams, 'Bad'), step, token);

		expect(error.reason).toBe('unreachable');
	});

	describe.each(STEPS)('at %s', (step) => {
		it.each([
			[401, 'unauthorised'],
			[403, 'unauthorised'],
			[404, 'mcp-disabled'],
			[500, 'unreachable'],
			[-1, 'unreachable'],
		])('maps the HTTP status %s to %s', (status, reason) => {
			const error = toRemoteError(new StreamableHTTPError(status, 'Failed'), step, token);

			expect(error.reason).toBe(reason);
		});

		it('reports unreachable for an error that is not from the SDK', () => {
			expect(toRemoteError(new TypeError('fetch failed'), step, token).reason).toBe('unreachable');
		});

		it('reports unreachable when the connection closes', () => {
			const closed = new McpError(ErrorCode.ConnectionClosed, 'Connection closed');

			expect(toRemoteError(closed, step, token).reason).toBe('unreachable');
		});
	});

	it.each([ErrorCode.RequestTimeout, ErrorCode.InternalError, ErrorCode.InvalidParams])(
		'reports unreachable for the MCP error %s while the connection is set up',
		(code) => {
			expect(toRemoteError(new McpError(code, 'Failed'), 'connect', token).reason).toBe(
				'unreachable',
			);
		},
	);

	it.each<RemoteStep>(['list', 'call'])('reports timeout when a %s request times out', (step) => {
		const timedOut = new McpError(ErrorCode.RequestTimeout, 'Request timed out');

		expect(toRemoteError(timedOut, step, token).reason).toBe('timeout');
	});

	it('reports unreachable when the remote returns an error to the tool list', () => {
		const error = toRemoteError(new McpError(ErrorCode.InternalError, 'Boom'), 'list', token);

		expect(error.reason).toBe('unreachable');
	});

	it('reports tool-error with the redacted remote text for an error returned to a tool call', () => {
		const remote = new McpError(ErrorCode.InvalidParams, `Tool not found, token ${token}`);

		const error = toRemoteError(remote, 'call', token);

		expect(error.reason).toBe('tool-error');
		expect(error.message).toBe(
			`MCP error ${ErrorCode.InvalidParams}: Tool not found, token [REDACTED]`,
		);
		expect(error.cause).toBeUndefined();
	});
});

describe('remoteText', () => {
	it.each(['', '  \n\t'])('returns undefined for blank text %j', (blank) => {
		expect(remoteText(blank, token)).toBeUndefined();
	});

	it('replaces every copy of the token', () => {
		expect(remoteText(`${token} and ${token}`, token)).toBe('[REDACTED] and [REDACTED]');
	});

	it('cuts the text to 500 characters', () => {
		const result = remoteText('x'.repeat(600), token);

		expect(result).toBe(`${'x'.repeat(500)}...`);
	});
});

describe('readToolResult', () => {
	it('returns the structured content first', () => {
		const result = readToolResult(
			{ content: [text('{"a":1}')], structuredContent: { b: 2 } },
			token,
		);

		expect(result).toEqual({ b: 2 });
	});

	it('parses the text as JSON and skips blocks that are not text', () => {
		const image = { type: 'image', data: 'aGk=', mimeType: 'image/png' };

		expect(readToolResult({ content: [image, text('{"a":1}')] }, token)).toEqual({ a: 1 });
	});

	it('joins text blocks with a line break', () => {
		const result = readToolResult({ content: [text('line one'), text('line two')] }, token);

		expect(result).toBe('line one\nline two');
	});

	it('returns an empty text when there is no content', () => {
		expect(readToolResult({}, token)).toBe('');
	});

	it('throws tool-error with the redacted text when the tool reports a failure', () => {
		const error = caught(() =>
			readToolResult({ content: [text(`Refused ${token}`)], isError: true }, token),
		);

		expect(error.reason).toBe('tool-error');
		expect(error.message).toBe('Refused [REDACTED]');
	});

	it('throws tool-error with the default message when the failure has no text', () => {
		const error = caught(() => readToolResult({ content: [text(' ')], isError: true }, token));

		expect(error.message).toBe('The tool on the linked instance failed.');
	});

	it.each([null, 'text', { content: 'not a list' }, { isError: 'yes' }])(
		'throws tool-error for the unknown result %j',
		(raw) => {
			const error = caught(() => readToolResult(raw, token));

			expect(error.reason).toBe('tool-error');
			expect(error.message).toBe('The linked instance sent a tool result in an unknown format.');
		},
	);
});
