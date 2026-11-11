import type { SerializableAgentState } from '@n8n/agents';
import { APPROVAL_RESUME_SCHEMA } from '@n8n/agents/tool';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';

import { findPendingStandardApproval, parseStandardApprovalSuspension } from '../standard-approval';

const payload = { type: 'approval', toolName: 'send_email', args: { to: 'ana@example.com' } };
const resumeSchema = zodToJsonSchema(APPROVAL_RESUME_SCHEMA);

describe('parseStandardApprovalSuspension', () => {
	it('returns the payload of a plain approval', () => {
		expect(parseStandardApprovalSuspension({ suspendPayload: payload, resumeSchema })).toEqual(
			payload,
		);
	});

	it.each([
		['another resume schema', { suspendPayload: payload, resumeSchema: { type: 'object' } }],
		['a payload that is not an approval', { suspendPayload: { type: 'form' }, resumeSchema }],
	])('rejects %s', (_, suspension) => {
		expect(parseStandardApprovalSuspension(suspension)).toBeUndefined();
	});
});

describe('findPendingStandardApproval', () => {
	const expected = {
		runId: 'run-1',
		toolCallId: 'call-1',
		threadId: 'thread-1',
		resourceId: 'resource-1',
	};

	function checkpoint(
		overrides: Record<string, unknown> = {},
		pending: Record<string, unknown> = {},
	) {
		return {
			status: 'suspended',
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
			pendingToolCalls: {
				'call-1': {
					toolCallId: 'call-1',
					toolName: 'send_email',
					input: {},
					suspended: true,
					runId: 'run-1',
					suspendPayload: payload,
					resumeSchema,
					...pending,
				},
			},
			...overrides,
		} as unknown as SerializableAgentState;
	}

	it('returns the approval that the checkpoint waits for', () => {
		expect(findPendingStandardApproval(checkpoint(), expected)).toEqual(payload);
	});

	it.each([
		['no checkpoint', undefined],
		['a checkpoint that is not suspended', checkpoint({ status: 'running' })],
		[
			'another thread',
			checkpoint({ persistence: { threadId: 'thread-2', resourceId: 'resource-1' } }),
		],
		[
			'another memory resource',
			checkpoint({ persistence: { threadId: 'thread-1', resourceId: 'resource-2' } }),
		],
		[
			'a delegated run',
			checkpoint({
				persistence: { threadId: 'thread-1', resourceId: 'resource-1', delegated: true },
			}),
		],
		['another tool call', checkpoint({ pendingToolCalls: {} })],
		['a tool call that does not wait', checkpoint({}, { suspended: false })],
		['a tool call of another run', checkpoint({}, { runId: 'run-2' })],
		['input other than an approval', checkpoint({}, { suspendPayload: { type: 'form' } })],
	])('returns nothing for %s', (_, state) => {
		expect(findPendingStandardApproval(state, expected)).toBeUndefined();
	});
});
