import { N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';

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
