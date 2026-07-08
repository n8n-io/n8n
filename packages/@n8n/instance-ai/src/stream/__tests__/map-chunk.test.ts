import { isQuotaExhaustedError, mapAgentChunkToEvent } from '../map-chunk';

type ApiCallError = Error & { statusCode?: number; responseBody?: string; url?: string };

function apiError(message: string, statusCode?: number, responseBody?: string): ApiCallError {
	const error = new Error(message) as ApiCallError;
	if (statusCode !== undefined) error.statusCode = statusCode;
	if (responseBody !== undefined) error.responseBody = responseBody;
	return error;
}

describe('isQuotaExhaustedError', () => {
	it('matches the proxy quota message on a plain string', () => {
		expect(isQuotaExhaustedError('Have reached end of quota')).toBe(true);
	});

	it('matches quota keywords in an Error message regardless of status', () => {
		expect(isQuotaExhaustedError(apiError('Have reached end of quota'))).toBe(true);
		expect(isQuotaExhaustedError(apiError('You are out of credits'))).toBe(true);
	});

	it('matches a quota message carried in the JSON responseBody', () => {
		const error = apiError(
			'Forbidden',
			403,
			JSON.stringify({ error: { message: 'Quota exceeded for this account' } }),
		);
		expect(isQuotaExhaustedError(error)).toBe(true);
	});

	it('matches a 403 combined with a quota/credit token', () => {
		expect(isQuotaExhaustedError(apiError('request blocked: quota', 403))).toBe(true);
	});

	it('does not match a bare 403 without quota/credit signal', () => {
		expect(isQuotaExhaustedError(apiError('Forbidden', 403))).toBe(false);
	});

	it('does not match unrelated errors', () => {
		expect(isQuotaExhaustedError(apiError('Rate limited', 429))).toBe(false);
		expect(isQuotaExhaustedError('Something went wrong')).toBe(false);
		expect(isQuotaExhaustedError(undefined)).toBe(false);
	});
});

describe('mapAgentChunkToEvent', () => {
	const runId = 'run-1';
	const agentId = 'agent-1';

	const map = (chunk: unknown, responseId?: string) =>
		mapAgentChunkToEvent(runId, agentId, chunk, responseId);

	it('returns null for invalid and ignored chunks', () => {
		expect(map(null)).toBeNull();
		expect(map('hello')).toBeNull();
		expect(map({ payload: { text: 'hi' } })).toBeNull();
		expect(map({ type: 'finish', finishReason: 'stop' })).toBeNull();
		expect(map({ type: 'tool-call-delta', argumentsDelta: '{"x"' })).toBeNull();
	});

	it('maps native text deltas', () => {
		expect(map({ type: 'text-delta', delta: 'hello' })).toEqual({
			type: 'text-delta',
			runId,
			agentId,
			payload: { text: 'hello' },
		});
	});

	it('maps native reasoning deltas', () => {
		expect(map({ type: 'reasoning-delta', delta: 'thinking...' })).toEqual({
			type: 'reasoning-delta',
			runId,
			agentId,
			payload: { text: 'thinking...' },
		});
	});

	it('preserves responseId when provided', () => {
		expect(map({ type: 'text-delta', delta: 'hello' }, 'response-1')).toEqual({
			type: 'text-delta',
			runId,
			agentId,
			responseId: 'response-1',
			payload: { text: 'hello' },
		});
	});

	it('maps native tool call messages', () => {
		expect(
			map({
				type: 'message',
				message: {
					role: 'tool',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'tc-1',
							toolName: 'create-workflow',
							input: { name: 'Workflow' },
						},
					],
				},
			}),
		).toEqual({
			type: 'tool-call',
			runId,
			agentId,
			payload: {
				toolCallId: 'tc-1',
				toolName: 'create-workflow',
				args: { name: 'Workflow' },
			},
		});
	});

	it('ignores malformed native message chunks', () => {
		expect(map({ type: 'message', message: null })).toBeNull();
		expect(map({ type: 'message', message: { role: 'tool' } })).toBeNull();
		expect(map({ type: 'message', message: { role: 'tool', content: null } })).toBeNull();
	});

	it('maps native tool result messages', () => {
		expect(
			map({
				type: 'message',
				message: {
					role: 'tool',
					content: [
						{
							type: 'tool-result',
							toolCallId: 'tc-1',
							toolName: 'create-workflow',
							result: { workflowId: 'wf-1' },
						},
					],
				},
			}),
		).toEqual({
			type: 'tool-result',
			runId,
			agentId,
			payload: {
				toolCallId: 'tc-1',
				result: { workflowId: 'wf-1' },
			},
		});
	});

	it('maps native tool result errors', () => {
		expect(
			map({
				type: 'message',
				message: {
					role: 'tool',
					content: [
						{
							type: 'tool-result',
							toolCallId: 'tc-1',
							toolName: 'create-workflow',
							result: 'Could not create workflow',
							isError: true,
						},
					],
				},
			}),
		).toEqual({
			type: 'tool-error',
			runId,
			agentId,
			payload: {
				toolCallId: 'tc-1',
				error: 'Could not create workflow',
			},
		});
	});

	it('maps native tool result Error objects to their messages', () => {
		expect(
			map({
				type: 'tool-result',
				toolCallId: 'tc-1',
				output: new Error('Browser access denied'),
				isError: true,
			}),
		).toEqual({
			type: 'tool-error',
			runId,
			agentId,
			payload: {
				toolCallId: 'tc-1',
				error: 'Browser access denied',
			},
		});
	});

	it('maps native MCP text error content to tool errors', () => {
		expect(
			map({
				type: 'tool-result',
				toolCallId: 'tc-1',
				output: {
					content: [{ type: 'text', text: 'File too large' }],
					isError: true,
				},
				isError: true,
			}),
		).toEqual({
			type: 'tool-error',
			runId,
			agentId,
			payload: {
				toolCallId: 'tc-1',
				error: 'File too large',
			},
		});
	});

	it('maps structured native MCP error content to tool errors', () => {
		expect(
			map({
				type: 'message',
				message: {
					role: 'tool',
					content: [
						{
							type: 'tool-result',
							toolCallId: 'tc-1',
							result: {
								content: [
									{
										type: 'text',
										text: JSON.stringify({ error: { message: 'Access denied by user' } }),
									},
								],
								isError: true,
							},
							isError: true,
						},
					],
				},
			}),
		).toEqual({
			type: 'tool-error',
			runId,
			agentId,
			payload: {
				toolCallId: 'tc-1',
				error: 'Access denied by user',
			},
		});
	});

	it('maps native suspension chunks to confirmation requests', () => {
		const validSetupNode = {
			node: {
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				parameters: {},
				position: [0, 0] as [number, number],
				id: 'node-1',
			},
			isTrigger: false,
		};

		expect(
			map({
				type: 'tool-call-suspended',
				toolCallId: 'tc-1',
				toolName: 'ask-user',
				input: { prompt: 'Confirm?' },
				suspendPayload: {
					requestId: 'request-1',
					severity: 'destructive',
					message: 'Need approval',
					credentialRequests: [
						{
							credentialType: 'slackApi',
							reason: 'Need Slack access',
							existingCredentials: [{ id: 'cred-1', name: 'Main Slack' }],
							suggestedName: 'Slack API',
						},
					],
					projectId: 'project-1',
					inputType: 'plan-review',
					questions: [
						{
							id: 'q1',
							question: 'Which channel?',
							type: 'text',
						},
					],
					introMessage: 'Before continuing',
					tasks: {
						tasks: [{ id: 't1', description: 'Build workflow', status: 'todo' }],
					},
					planItems: [
						{
							id: 'task-1',
							title: 'Build workflow',
							kind: 'build-workflow',
							spec: 'Create a workflow',
							deps: [],
						},
					],
					domainAccess: { url: 'https://example.com/api', host: 'example.com' },
					credentialFlow: { stage: 'generic' },
					setupRequests: [validSetupNode],
					workflowId: 'wf-1',
					resourceDecision: {
						toolGroup: 'Local Gateway',
						resource: '/tmp/file.txt',
						description: 'Read /tmp/file.txt',
						options: ['allowForSession', 'denyOnce'],
					},
				},
			}),
		).toEqual({
			type: 'confirmation-request',
			runId,
			agentId,
			payload: {
				requestId: 'request-1',
				toolCallId: 'tc-1',
				toolName: 'ask-user',
				args: { prompt: 'Confirm?' },
				severity: 'destructive',
				message: 'Need approval',
				credentialRequests: [
					{
						credentialType: 'slackApi',
						reason: 'Need Slack access',
						existingCredentials: [{ id: 'cred-1', name: 'Main Slack' }],
						suggestedName: 'Slack API',
					},
				],
				projectId: 'project-1',
				inputType: 'plan-review',
				domainAccess: { url: 'https://example.com/api', host: 'example.com' },
				credentialFlow: { stage: 'generic' },
				setupRequests: [validSetupNode],
				workflowId: 'wf-1',
				questions: [
					{
						id: 'q1',
						question: 'Which channel?',
						type: 'text',
					},
				],
				introMessage: 'Before continuing',
				tasks: {
					tasks: [{ id: 't1', description: 'Build workflow', status: 'todo' }],
				},
				planItems: [
					{
						id: 'task-1',
						title: 'Build workflow',
						kind: 'build-workflow',
						spec: 'Create a workflow',
						deps: [],
					},
				],
				resourceDecision: {
					toolGroup: 'Local Gateway',
					resource: '/tmp/file.txt',
					description: 'Read /tmp/file.txt',
					options: ['allowForSession', 'denyOnce'],
				},
			},
		});
	});

	it('defaults optional suspension values and filters invalid structured payloads', () => {
		const result = map({
			type: 'tool-call-suspended',
			toolCallId: 'tc-1',
			suspendPayload: {
				severity: 'unknown',
				credentialRequests: [{ invalid: true }],
				inputType: 'bad-input-type',
				questions: [{ invalid: true }],
				tasks: { tasks: [{ invalid: true }] },
				domainAccess: { url: 'https://example.com' },
				webSearch: { invalid: true },
				credentialFlow: { stage: 'unknown' },
				setupRequests: [{ invalid: true }],
				workflowId: 42,
			},
		});

		expect(result).toEqual({
			type: 'confirmation-request',
			runId,
			agentId,
			payload: {
				requestId: 'tc-1',
				toolCallId: 'tc-1',
				toolName: '',
				args: {},
				severity: 'warning',
				message: 'Confirmation required',
			},
		});
	});

	it('maps pause-for-user continue confirmations and web search metadata', () => {
		expect(
			map({
				type: 'tool-call-suspended',
				toolCallId: 'tc-1',
				toolName: 'pause-for-user',
				suspendPayload: {
					requestId: 'request-1',
					inputType: 'continue',
					message: 'Continue after reviewing results',
					webSearch: { query: 'n8n agents deferred tools' },
				},
			}),
		).toEqual({
			type: 'confirmation-request',
			runId,
			agentId,
			payload: {
				requestId: 'request-1',
				toolCallId: 'tc-1',
				toolName: 'pause-for-user',
				args: {},
				severity: 'warning',
				message: 'Continue after reviewing results',
				inputType: 'continue',
				webSearch: { query: 'n8n agents deferred tools' },
			},
		});
	});

	it('returns null for suspensions without a tool call id', () => {
		expect(
			map({ type: 'tool-call-suspended', suspendPayload: { requestId: 'request-1' } }),
		).toBeNull();
	});

	it('maps native error chunks with provider metadata when available', () => {
		const error = new Error('Provider failed') as Error & {
			statusCode: number;
			responseBody: string;
			url: string;
		};
		error.statusCode = 429;
		error.responseBody = JSON.stringify({ error: { message: 'Rate limited' } });
		error.url = 'https://api.openai.com/v1/responses';

		expect(map({ type: 'error', error })).toEqual({
			type: 'error',
			runId,
			agentId,
			payload: {
				content: 'Rate limited',
				statusCode: 429,
				provider: 'OpenAI',
				technicalDetails: JSON.stringify({ error: { message: 'Rate limited' } }),
			},
		});
	});

	it('tags quota-exhausted error chunks with a quota_exhausted code', () => {
		const error = apiError(
			'Forbidden',
			403,
			JSON.stringify({ error: { message: 'Have reached end of quota' } }),
		);

		expect(map({ type: 'error', error })).toEqual({
			type: 'error',
			runId,
			agentId,
			payload: {
				content: 'Have reached end of quota',
				statusCode: 403,
				code: 'quota_exhausted',
				technicalDetails: JSON.stringify({ error: { message: 'Have reached end of quota' } }),
			},
		});
	});
});
