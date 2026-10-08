import fc from 'fast-check';
import { N8N_CHAT_ACTION_TOOL_NAME, type AgentPersistedMessageContentPart } from '@n8n/api-types';

import { DELEGATE_SUB_AGENT_TOOL_NAME } from '../delegateTool';
import {
	attachmentFromPersistedPart,
	reasoningSegmentFromPersistedPart,
	toolCallFromPersistedPart,
} from '../persistedParts';

describe('toolCallFromPersistedPart', () => {
	it('maps a resolved call to a done call with its output, input and timings', () => {
		const childTrace = { text: 'Found it', reasoningSegments: [], steps: [] };
		const call = toolCallFromPersistedPart(
			{
				type: 'tool-call',
				toolName: 'read_file',
				toolCallId: 'call-1',
				input: { path: 'a.md' },
				state: 'resolved',
				output: { content: '# A' },
				startTime: 0,
				endTime: 25,
				suspendPayload: { type: 'approval' },
				childTrace,
			},
			'read_file',
			false,
		);

		expect(call).toStrictEqual({
			tool: 'read_file',
			toolCallId: 'call-1',
			input: { path: 'a.md' },
			output: { content: '# A' },
			state: 'done',
			startTime: 0,
			endTime: 25,
			suspendPayload: { type: 'approval' },
			childProgress: childTrace,
			displaySummary: undefined,
		});
	});

	it('leaves out the optional fields that the part does not carry', () => {
		const call = toolCallFromPersistedPart(
			{ type: 'tool-call', toolName: 'read_file', state: 'running' },
			'read_file',
			false,
		);

		expect(call).toStrictEqual({
			tool: 'read_file',
			toolCallId: '',
			input: undefined,
			state: 'running',
			displaySummary: undefined,
		});
	});

	it('maps a cancelled call to the cancelled state and keeps its output', () => {
		const call = toolCallFromPersistedPart(
			{ type: 'tool-call', state: 'resolved', canceled: true, output: { declined: true } },
			'delete_file',
			false,
		);

		expect(call).toMatchObject({ state: 'cancelled', canceled: true, output: { declined: true } });
	});

	it('maps a resolved delegation that failed to the error state', () => {
		const failed = toolCallFromPersistedPart(
			{ type: 'tool-call', state: 'resolved', output: { status: 'failed', error: 'No access' } },
			DELEGATE_SUB_AGENT_TOOL_NAME,
			false,
		);
		const completed = toolCallFromPersistedPart(
			{ type: 'tool-call', state: 'resolved', output: { status: 'completed', answer: 'Done' } },
			DELEGATE_SUB_AGENT_TOOL_NAME,
			false,
		);

		expect(failed.state).toBe('error');
		expect(completed.state).toBe('done');
	});

	it('maps a rejected call to the error state with the recorded error as output', () => {
		const call = toolCallFromPersistedPart(
			{ type: 'tool-call', state: 'rejected', error: 'Error: permission denied' },
			'delete_file',
			false,
		);

		expect(call).toMatchObject({ state: 'error', output: 'Error: permission denied' });
		expect(call).not.toHaveProperty('canceled');
	});

	it('maps an unfinished call of a failed run to the error state', () => {
		const call = toolCallFromPersistedPart(
			{ type: 'tool-call', state: 'running', error: 'Run interrupted' },
			'read_file',
			true,
		);

		expect(call).toMatchObject({ state: 'error', output: 'Run interrupted' });
	});

	it('maps an unfinished call of a live run to the running state without output', () => {
		const call = toolCallFromPersistedPart(
			{ type: 'tool-call', state: 'running', output: { partial: true } },
			'read_file',
			false,
		);

		expect(call.state).toBe('running');
		expect(call).not.toHaveProperty('output');
	});

	it('summarises the answer of a chat card from its output and input', () => {
		const call = toolCallFromPersistedPart(
			{
				type: 'tool-call',
				state: 'resolved',
				input: {
					action: 'respond',
					input: {
						message: {
							card: {
								components: [{ type: 'button', label: 'Approve & Send', value: 'approve' }],
							},
						},
					},
				},
				output: { type: 'button', value: 'approve' },
			},
			N8N_CHAT_ACTION_TOOL_NAME,
			false,
		);

		expect(call.displaySummary).toBe('Approve & Send');
	});
});

describe('toolCallFromPersistedPart properties', () => {
	const FAILED_DELEGATION = { status: 'failed', error: 'No access' };

	const partArb = fc.record(
		{
			type: fc.constant('tool-call'),
			state: fc.constantFrom('resolved', 'rejected', 'running', 'suspended', undefined),
			canceled: fc.constantFrom(true, false, undefined),
			output: fc.oneof(
				fc.constant(undefined),
				fc.constant(FAILED_DELEGATION),
				fc.constant({ status: 'completed', answer: 'Done' }),
				// Other outputs never read as a delegation status.
				fc
					.jsonValue()
					.filter((value) => !JSON.stringify(value).includes('"status"')),
			),
			error: fc.option(fc.string(), { nil: undefined }),
		},
		{ requiredKeys: ['type'] },
	);
	const toolNameArb = fc.constantFrom(DELEGATE_SUB_AGENT_TOOL_NAME, 'read_file');

	/** The state table, written out without the helpers of the mapper. */
	function expectedState(
		part: AgentPersistedMessageContentPart,
		toolName: string,
		failed: boolean,
	) {
		if (part.state === 'resolved') {
			if (part.canceled === true) return 'cancelled';
			const failedDelegation =
				toolName === DELEGATE_SUB_AGENT_TOOL_NAME && part.output === FAILED_DELEGATION;
			return failedDelegation ? 'error' : 'done';
		}
		return part.state === 'rejected' || failed ? 'error' : 'running';
	}

	it('follows the state table for every state, cancel flag, run outcome and output', () => {
		fc.assert(
			fc.property(partArb, toolNameArb, fc.boolean(), (part, toolName, failed) => {
				expect(toolCallFromPersistedPart(part, toolName, failed).state).toBe(
					expectedState(part, toolName, failed),
				);
			}),
		);
	});

	it('never maps a resolved call to running, whatever the run outcome', () => {
		fc.assert(
			fc.property(partArb, toolNameArb, fc.boolean(), (part, toolName, failed) => {
				const resolved = { ...part, state: 'resolved' };
				const call = toolCallFromPersistedPart(resolved, toolName, failed);

				expect(call.state).not.toBe('running');
				expect(call.state).toBe(toolCallFromPersistedPart(resolved, toolName, !failed).state);
			}),
		);
	});

	it('gives a running call no output, and takes the output of a settled call from the part', () => {
		fc.assert(
			fc.property(partArb, toolNameArb, fc.boolean(), (part, toolName, failed) => {
				const call = toolCallFromPersistedPart(part, toolName, failed);
				const source = part.state === 'resolved' ? part.output : part.error;

				if (call.state === 'running') {
					expect(call).not.toHaveProperty('output');
				} else if (source === undefined) {
					expect(call).not.toHaveProperty('output');
				} else {
					expect(call.output).toBe(source);
				}
			}),
		);
	});

	it('marks a call as cancelled exactly when the part carries the cancel flag', () => {
		fc.assert(
			fc.property(partArb, toolNameArb, fc.boolean(), (part, toolName, failed) => {
				const call = toolCallFromPersistedPart(part, toolName, failed);

				expect(call.canceled === true).toBe(part.canceled === true);
				expect(call.state === 'cancelled').toBe(
					part.state === 'resolved' && part.canceled === true,
				);
			}),
		);
	});

	it('maps an unfinished call of a failed run to the error state with the recorded error', () => {
		const unfinishedArb = partArb.filter(
			(part) => part.state !== 'resolved' && part.state !== 'rejected',
		);
		fc.assert(
			fc.property(unfinishedArb, toolNameArb, (part, toolName) => {
				const call = toolCallFromPersistedPart(part, toolName, true);

				expect(call.state).toBe('error');
				expect(call.output).toBe(part.error);
			}),
		);
	});
});

describe('attachmentFromPersistedPart', () => {
	it('keeps the file metadata of the part', () => {
		expect(
			attachmentFromPersistedPart(
				{ type: 'file', fileName: 'notes.md', mimeType: 'text/markdown', sizeBytes: 42 },
				'file-1',
			),
		).toEqual({ fileId: 'file-1', fileName: 'notes.md', mimeType: 'text/markdown', sizeBytes: 42 });
	});

	it('uses a generic name and binary type when the part has none', () => {
		expect(attachmentFromPersistedPart({ type: 'file' }, 'file-1')).toStrictEqual({
			fileId: 'file-1',
			fileName: 'attachment',
			mimeType: 'application/octet-stream',
			sizeBytes: undefined,
		});
	});
});

describe('reasoningSegmentFromPersistedPart', () => {
	it('keeps the timings of the part, also a zero start time', () => {
		expect(
			reasoningSegmentFromPersistedPart(
				{ type: 'reasoning', startTime: 0, endTime: 1500 },
				'Plan.',
				'm1:reasoning:0',
			),
		).toEqual({ id: 'm1:reasoning:0', content: 'Plan.', startTime: 0, endTime: 1500 });
	});

	it('leaves out timings that the part does not carry', () => {
		const segment = reasoningSegmentFromPersistedPart(
			{ type: 'reasoning' },
			'Plan.',
			'm1:reasoning:0',
		);

		expect(segment).toEqual({ id: 'm1:reasoning:0', content: 'Plan.' });
		expect(segment).not.toHaveProperty('startTime');
		expect(segment).not.toHaveProperty('endTime');
	});
});
