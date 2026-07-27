import {
	cleanStoredUserMessage,
	extractAgentPreviewHandoffContext,
	extractEditorContextResourceAttachments,
	withCurrentDateTime,
	AUTO_FOLLOW_UP_MESSAGE,
} from '../internal-messages';

type EditorContextAttachment =
	| { type: 'workflow'; id: string; name?: string; executionId?: string }
	| { type: 'agent'; id: string; name?: string; projectId: string };

/** Mirrors the marker the service writes in buildContextResourcesBlock. */
function editorContextMarker(
	attachments: EditorContextAttachment[],
	prose = 'The user opened this conversation from the workflow editor.',
): string {
	return `<editor-context>\n${JSON.stringify(attachments)}\n\n${prose}\n</editor-context>`;
}

function credentialContextMarker(): string {
	return `<credential-context>\n${JSON.stringify({
		source: 'credential-modal',
		credential: { credentialType: 'gmailOAuth2Api', displayName: 'Gmail OAuth2 API' },
	})}\n\nThe user opened this conversation from the credential setup modal.\n</credential-context>`;
}

function agentPreviewContextMarker(
	context: {
		source: 'agent-preview';
		agentId: string;
		threadId: string;
		executionId?: string;
	} = {
		source: 'agent-preview',
		agentId: 'agent-1',
		threadId: 'preview-thread-1',
	},
): string {
	return `<agent-preview-context>\n${JSON.stringify(context)}\n\nThe user shared a preview transcript.\n</agent-preview-context>`;
}

describe('cleanStoredUserMessage', () => {
	it('returns plain text unchanged', () => {
		expect(cleanStoredUserMessage('Hello world')).toBe('Hello world');
	});

	it('strips <running-tasks> block from the beginning', () => {
		const stored =
			'<running-tasks>\n[task-1 builder running]\n</running-tasks>\n\nActual user message';
		expect(cleanStoredUserMessage(stored)).toBe('Actual user message');
	});

	it('strips <planned-task-follow-up> block', () => {
		const stored =
			'<planned-task-follow-up taskId="t1">\nfollow up details\n</planned-task-follow-up>\n\nContinue building';
		expect(cleanStoredUserMessage(stored)).toBe('Continue building');
	});

	it('strips <background-task-completed> block', () => {
		const stored =
			'<background-task-completed>\ntask-1 completed with result\n</background-task-completed>\n\nUser reply';
		expect(cleanStoredUserMessage(stored)).toBe('User reply');
	});

	it('strips <workflow-verification-follow-up> block', () => {
		const stored =
			'<workflow-verification-follow-up>\n{"workItemId":"wi-1"}\n</workflow-verification-follow-up>\n\nUser reply';
		expect(cleanStoredUserMessage(stored)).toBe('User reply');
	});

	it('returns null for auto-follow-up message', () => {
		expect(cleanStoredUserMessage(AUTO_FOLLOW_UP_MESSAGE)).toBeNull();
	});

	it('returns null for auto-follow-up after stripping task block', () => {
		const stored = `<running-tasks>\n[task info]\n</running-tasks>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
		expect(cleanStoredUserMessage(stored)).toBeNull();
	});

	it('does not strip task blocks that are not at the beginning', () => {
		const stored = 'Some text\n<running-tasks>\ntask\n</running-tasks>\n\nMore text';
		expect(cleanStoredUserMessage(stored)).toBe(stored);
	});

	it('strips an <editor-context> block that is the entire message (no user text)', () => {
		const stored = editorContextMarker([{ type: 'workflow', id: 'wf-1', name: 'My workflow' }]);
		expect(cleanStoredUserMessage(stored)).toBe('');
	});

	it('strips an <editor-context> block followed by user text', () => {
		const stored = `${editorContextMarker([{ type: 'workflow', id: 'wf-1' }])}\n\nFix the trigger`;
		expect(cleanStoredUserMessage(stored)).toBe('Fix the trigger');
	});

	it('strips a <credential-context> block followed by user text', () => {
		const stored = `${credentialContextMarker()}\n\nHow do I set up Gmail OAuth?`;
		expect(cleanStoredUserMessage(stored)).toBe('How do I set up Gmail OAuth?');
	});

	it('strips an <agent-preview-context> block followed by user text', () => {
		const stored = `${agentPreviewContextMarker()}\n\nPlease improve this agent`;
		expect(cleanStoredUserMessage(stored)).toBe('Please improve this agent');
	});

	it('strips an <agent-preview-context> block that is the entire message', () => {
		expect(cleanStoredUserMessage(agentPreviewContextMarker())).toBe('');
	});

	it('strips stacked leading blocks (editor-context ahead of running-tasks)', () => {
		const stored = `${editorContextMarker([{ type: 'workflow', id: 'wf-1' }])}\n\n<running-tasks>\n[task info]\n</running-tasks>\n\nFix the trigger`;
		expect(cleanStoredUserMessage(stored)).toBe('Fix the trigger');
	});

	it('strips the appended <current-date-time> block', () => {
		const stored = withCurrentDateTime(
			'Build me a workflow',
			'\n## Current Date and Time\n\n2026-06-17T10:00+02:00',
		);
		expect(stored).toContain('<current-date-time>');
		expect(cleanStoredUserMessage(stored)).toBe('Build me a workflow');
	});

	it('strips both a leading task block and the appended date/time block', () => {
		const enriched = '<running-tasks>\n[task info]\n</running-tasks>\n\nUser message';
		const stored = withCurrentDateTime(enriched, '\n2026-06-17T10:00+02:00');
		expect(cleanStoredUserMessage(stored)).toBe('User message');
	});
});

describe('extractEditorContextResourceAttachments', () => {
	it('reconstructs workflow attachments from the marker', () => {
		const stored = editorContextMarker([
			{ type: 'workflow', id: 'wf-1', name: 'My workflow', executionId: '6669' },
		]);
		expect(extractEditorContextResourceAttachments(stored)).toEqual([
			{ type: 'workflow', id: 'wf-1', name: 'My workflow', executionId: '6669' },
		]);
	});

	it('reconstructs agent attachments from the marker', () => {
		const stored = editorContextMarker(
			[{ type: 'agent', id: 'agent-1', name: 'Support Agent', projectId: 'proj-1' }],
			'The user opened this conversation from the agent editor.',
		);
		expect(extractEditorContextResourceAttachments(stored)).toEqual([
			{ type: 'agent', id: 'agent-1', name: 'Support Agent', projectId: 'proj-1' },
		]);
	});

	it('reconstructs mixed workflow and agent attachments from the marker', () => {
		const stored = editorContextMarker(
			[
				{ type: 'workflow', id: 'wf-1', name: 'My workflow' },
				{ type: 'agent', id: 'agent-1', name: 'Support Agent', projectId: 'proj-1' },
			],
			'prose',
		);
		expect(extractEditorContextResourceAttachments(stored)).toEqual([
			{ type: 'workflow', id: 'wf-1', name: 'My workflow' },
			{ type: 'agent', id: 'agent-1', name: 'Support Agent', projectId: 'proj-1' },
		]);
	});

	it('returns an empty array for a message without an editor-context block', () => {
		expect(extractEditorContextResourceAttachments('Just a normal message')).toEqual([]);
	});

	it('returns an empty array when the marker JSON is invalid', () => {
		const stored = '<editor-context>\nnot json\n\nprose\n</editor-context>';
		expect(extractEditorContextResourceAttachments(stored)).toEqual([]);
	});
});

describe('extractAgentPreviewHandoffContext', () => {
	it('reconstructs the handoff context from the marker', () => {
		const context = {
			source: 'agent-preview' as const,
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			executionId: 'exec-9',
		};
		expect(extractAgentPreviewHandoffContext(agentPreviewContextMarker(context))).toEqual(context);
	});

	it('returns undefined for a message without an agent-preview-context block', () => {
		expect(extractAgentPreviewHandoffContext('Just a normal message')).toBeUndefined();
	});

	it('returns undefined when the marker JSON is invalid', () => {
		const stored = '<agent-preview-context>\nnot json\n\nprose\n</agent-preview-context>';
		expect(extractAgentPreviewHandoffContext(stored)).toBeUndefined();
	});
});
