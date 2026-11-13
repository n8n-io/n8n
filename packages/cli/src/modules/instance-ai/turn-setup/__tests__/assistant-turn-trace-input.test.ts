import { buildAssistantTurnTraceInput } from '../assistant-turn-trace-input';

describe('buildAssistantTurnTraceInput', () => {
	it('records the message alone when the turn has nothing else', () => {
		expect(
			buildAssistantTurnTraceInput({ message: 'Hi', fileAttachments: [], contextAttachments: [] }),
		).toEqual({ message: 'Hi' });
	});

	it('records files by type and size, and resources by reference', () => {
		expect(
			buildAssistantTurnTraceInput({
				message: 'Fix this',
				fileAttachments: [
					{ type: 'file', data: 'aGVsbG8=', mimeType: 'text/plain', fileName: 'notes.txt' },
				],
				contextAttachments: [
					{ type: 'workflow', id: 'wf-1', name: 'Digest', executionId: 'exec-1' },
					{ type: 'agent', id: 'agent-1', name: 'Triage', projectId: 'project-1' },
					{ type: 'nodes', workflowId: 'wf-1', sets: [{ nodes: [{ id: 'n-1', name: 'Slack' }] }] },
				],
				messageGroupId: 'mg-1',
			}),
		).toEqual({
			message: 'Fix this',
			attachments: [{ mimeType: 'text/plain', size: 8 }],
			resourceAttachments: [
				{ type: 'workflow', id: 'wf-1', executionId: 'exec-1' },
				{ type: 'agent', id: 'agent-1', projectId: 'project-1' },
				{ type: 'nodes', id: 'wf-1' },
			],
			messageGroupId: 'mg-1',
		});
	});

	it('records a stored file with the same size as its base64 content', () => {
		expect(
			buildAssistantTurnTraceInput({
				message: 'Read this',
				fileAttachments: [{ mimeType: 'text/plain', sizeBytes: 5 }],
				contextAttachments: [],
			}),
		).toEqual({ message: 'Read this', attachments: [{ mimeType: 'text/plain', size: 8 }] });
	});
});
