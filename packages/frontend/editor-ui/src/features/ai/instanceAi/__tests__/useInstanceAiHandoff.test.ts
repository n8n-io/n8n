import { INSTANCE_AI_PREFILL_TYPE_FALLBACK } from '../prefills';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	instanceAiReady: { value: true },
	routerPush: vi.fn(),
	syncThread: vi.fn(),
	updateThreadMetadata: vi.fn(),
	deleteThread: vi.fn(),
	getOrCreateRuntime: vi.fn(),
	sendMessage: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({
		push: mocks.routerPush,
		resolve: vi.fn(),
	}),
}));
vi.mock('uuid', () => ({ v4: () => 'thread-1' }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {}, pushRef: 'push-ref' }),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError }),
}));
vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => mocks.instanceAiReady,
}));
vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		syncThread: mocks.syncThread,
		updateThreadMetadata: mocks.updateThreadMetadata,
		deleteThread: mocks.deleteThread,
		getOrCreateRuntime: mocks.getOrCreateRuntime,
	}),
}));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		personalProject: { id: 'personal-1' },
		getPersonalProject: vi.fn(),
	}),
}));

import {
	buildInstanceAiAgentPreviewHandoffContext,
	buildInstanceAiCredentialHandoffContext,
	clearPendingAgentAttachment,
	clearPendingComposerDraft,
	clearPendingFirstMessage,
	clearPendingHandoffContext,
	clearPendingThreadHandoff,
	clearPendingMentionDraft,
	consumePendingMentionDraft,
	clearPendingWorkflowAttachment,
	consumePendingFirstMessage,
	consumePendingRedirectLanding,
	getPendingAgentAttachment,
	getPendingComposerDraft,
	getPendingHandoffContext,
	getPendingWorkflowAttachment,
	provisionContextOnlyThread,
	provisionSubjectThread,
	provisionWorkflowThread,
	stashPendingAgentAttachment,
	stashPendingComposerDraft,
	stashPendingFirstMessage,
	stashPendingHandoffContext,
	stashPendingMentionDraft,
	stashPendingRedirectLanding,
	stashPendingWorkflowAttachment,
	useInstanceAiHandoff,
} from '../composables/useInstanceAiHandoff';
import type { PendingFirstMessage } from '../composables/useInstanceAiHandoff';
import { buildDraftMention } from '../mentions/buildMentionAttachment';

describe('useInstanceAiHandoff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		mocks.instanceAiReady.value = true;
		mocks.syncThread.mockResolvedValue(undefined);
		mocks.updateThreadMetadata.mockResolvedValue(undefined);
		mocks.deleteThread.mockResolvedValue(true);
		mocks.getOrCreateRuntime.mockReturnValue({ sendMessage: mocks.sendMessage });
	});

	it('builds credential modal handoff context without empty optional fields', () => {
		expect(
			buildInstanceAiCredentialHandoffContext({
				credentialType: 'gmailOAuth2',
				displayName: 'Gmail OAuth2 API',
				nodeName: 'Gmail',
				nodeType: 'n8n-nodes-base.gmail',
				documentationUrl:
					'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/',
				oauthRedirectUrl: 'http://localhost:5678/rest/oauth2-credential/callback',
			}),
		).toEqual({
			source: 'credential-modal',
			credential: {
				credentialType: 'gmailOAuth2',
				displayName: 'Gmail OAuth2 API',
				nodeName: 'Gmail',
				nodeType: 'n8n-nodes-base.gmail',
				documentationUrl:
					'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/',
				oauthRedirectUrl: 'http://localhost:5678/rest/oauth2-credential/callback',
			},
		});
	});

	it('builds agent preview handoff context for a full preview session', () => {
		expect(
			buildInstanceAiAgentPreviewHandoffContext({
				agentId: 'agent-1',
				threadId: 'thread-1',
			}),
		).toEqual({
			source: 'agent-preview',
			agentId: 'agent-1',
			threadId: 'thread-1',
		});
	});

	it('forwards executionId when provided', () => {
		expect(
			buildInstanceAiAgentPreviewHandoffContext({
				agentId: 'agent-1',
				threadId: 'thread-1',
				executionId: 'exec-1',
			}),
		).toEqual({
			source: 'agent-preview',
			agentId: 'agent-1',
			threadId: 'thread-1',
			executionId: 'exec-1',
		});
	});

	it('forwards agentName, agentIcon and sessionTitle when provided', () => {
		expect(
			buildInstanceAiAgentPreviewHandoffContext({
				agentId: 'agent-1',
				threadId: 'thread-1',
				agentName: 'SEO Auditor',
				agentIcon: 'search',
				sessionTitle: 'Help with tone',
			}),
		).toEqual({
			source: 'agent-preview',
			agentId: 'agent-1',
			threadId: 'thread-1',
			agentName: 'SEO Auditor',
			agentIcon: 'search',
			sessionTitle: 'Help with tone',
		});
	});

	it('keeps a pending handoff context until it is explicitly cleared', () => {
		const context = buildInstanceAiAgentPreviewHandoffContext({
			agentId: 'agent-1',
			threadId: 'thread-1',
		});

		stashPendingHandoffContext('thread-1', context);

		expect(getPendingHandoffContext('thread-1')).toEqual(context);
		expect(getPendingHandoffContext('thread-1')).toEqual(context);
		clearPendingHandoffContext('thread-1');
		expect(getPendingHandoffContext('thread-1')).toBeNull();
	});

	// A raw string is what a previous deploy stashed. Both surfaces that stash a
	// draft are hand-offs, so naming either one would mis-attribute the other --
	// report the read-path fallback instead of guessing.
	it('replays a composer draft stashed by a previous deploy under the fallback type', () => {
		localStorage.setItem('n8n-instance-ai-composer-draft:thread-1', 'Fix the failed tool calls');

		expect(getPendingComposerDraft('thread-1')).toEqual({
			text: 'Fix the failed tool calls',
			prefillType: INSTANCE_AI_PREFILL_TYPE_FALLBACK,
		});
	});

	it('keeps a pending composer draft until it is explicitly cleared', () => {
		stashPendingComposerDraft('thread-1', {
			text: 'Fix this tool failure',
			prefillType: 'handoff_credential_setup',
		});

		expect(getPendingComposerDraft('thread-1')).toEqual({
			text: 'Fix this tool failure',
			prefillType: 'handoff_credential_setup',
		});
		expect(getPendingComposerDraft('thread-1')).toEqual({
			text: 'Fix this tool failure',
			prefillType: 'handoff_credential_setup',
		});
		clearPendingComposerDraft('thread-1');
		expect(getPendingComposerDraft('thread-1')).toBeNull();
	});

	it('round-trips a mention draft exactly once', () => {
		const mention = buildDraftMention(
			{ kind: 'workflow', workflowId: 'workflow-1', workflowName: 'Support triage' },
			'typed',
		);
		const draft = {
			text: 'Review Support triage ',
			mentions: [mention],
			selectionStart: 22,
			selectionEnd: 22,
		};

		stashPendingMentionDraft('thread-1', draft);

		expect(consumePendingMentionDraft('thread-1')).toEqual(draft);
		expect(consumePendingMentionDraft('thread-1')).toBeNull();
	});

	it('rejects a mention draft whose key does not match its target', () => {
		const mention = buildDraftMention(
			{ kind: 'workflow', workflowId: 'workflow-1', workflowName: 'Support triage' },
			'typed',
		);
		stashPendingMentionDraft('thread-1', {
			text: 'Support triage ',
			mentions: [{ ...mention, key: 'workflow:other' }],
			selectionStart: 15,
			selectionEnd: 15,
		});

		expect(consumePendingMentionDraft('thread-1')).toBeNull();
	});

	it('clears a pending mention draft with the rest of a thread handoff', () => {
		const mention = buildDraftMention(
			{ kind: 'workflow', workflowId: 'workflow-1', workflowName: 'Support triage' },
			'button',
		);
		stashPendingMentionDraft('thread-1', {
			text: 'Support triage ',
			mentions: [mention],
			selectionStart: 15,
			selectionEnd: 15,
		});

		clearPendingThreadHandoff('thread-1');

		expect(consumePendingMentionDraft('thread-1')).toBeNull();
		clearPendingMentionDraft('thread-1');
	});

	it('provisions a context-only thread with an optional composer draft', async () => {
		const context = buildInstanceAiAgentPreviewHandoffContext({
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			executionId: 'exec-1',
		});
		const launch = {
			source: 'agent_preview' as const,
			origin: 'internal' as const,
		};

		const threadId = await provisionContextOnlyThread('project-1', context, launch, {
			text: 'Fix this tool failure',
			prefillType: 'handoff_credential_setup',
		});

		expect(threadId).toBe('thread-1');
		expect(mocks.syncThread).toHaveBeenCalledWith('thread-1', 'project-1', launch);
		expect(getPendingHandoffContext('thread-1')).toEqual(context);
		expect(getPendingComposerDraft('thread-1')).toEqual({
			text: 'Fix this tool failure',
			prefillType: 'handoff_credential_setup',
		});
	});

	it('keeps a pending agent attachment until it is explicitly cleared', () => {
		const attachment = {
			type: 'agent' as const,
			id: 'agent-1',
			name: 'New agent',
			projectId: 'project-1',
		};

		stashPendingAgentAttachment('thread-1', attachment);

		expect(getPendingAgentAttachment('thread-1')).toEqual(attachment);
		expect(getPendingAgentAttachment('thread-1')).toEqual(attachment);
		clearPendingAgentAttachment('thread-1');
		expect(getPendingAgentAttachment('thread-1')).toBeNull();
	});

	it('clears all pending handoff state for a thread', () => {
		const context = buildInstanceAiAgentPreviewHandoffContext({
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
		});
		stashPendingHandoffContext('thread-1', context);
		stashPendingComposerDraft('thread-1', {
			text: 'Fix the failed tool calls',
			prefillType: 'handoff_agent_change_request',
		});
		stashPendingAgentAttachment('thread-1', {
			type: 'agent',
			id: 'agent-1',
			projectId: 'project-1',
		});
		stashPendingWorkflowAttachment('thread-1', {
			type: 'workflow',
			id: 'wf-1',
			name: 'My Workflow',
		});

		stashPendingFirstMessage('thread-1', {
			message: 'Set up the credential',
			authorship: { kind: 'prefill', prefillType: 'handoff_credential_setup' },
		});
		stashPendingRedirectLanding('thread-1');

		clearPendingThreadHandoff('thread-1');

		expect(getPendingHandoffContext('thread-1')).toBeNull();
		expect(getPendingComposerDraft('thread-1')).toBeNull();
		expect(getPendingAgentAttachment('thread-1')).toBeNull();
		expect(getPendingWorkflowAttachment('thread-1')).toBeNull();
		// A thread that disappears before its opening message is replayed must not leave the
		// payload behind: nothing would ever consume it again.
		expect(consumePendingFirstMessage('thread-1')).toBeNull();
		expect(consumePendingRedirectLanding('thread-1')).toBe(false);
	});

	it('round-trips a pending workflow attachment', () => {
		stashPendingWorkflowAttachment('thread-1', {
			type: 'workflow',
			id: 'wf-1',
			name: 'My Workflow',
			executionId: 'exec-1',
		});

		expect(getPendingWorkflowAttachment('thread-1')).toEqual({
			type: 'workflow',
			id: 'wf-1',
			name: 'My Workflow',
			executionId: 'exec-1',
		});

		clearPendingWorkflowAttachment('thread-1');
		expect(getPendingWorkflowAttachment('thread-1')).toBeNull();
	});

	it('provisions a workflow thread without stashing an opening message', async () => {
		const threadId = await provisionWorkflowThread(
			'project-1',
			{ type: 'workflow', id: 'wf-1', name: 'My Workflow' },
			{ source: 'canvas_action_button', origin: 'internal' },
		);

		expect(threadId).toBe('thread-1');
		expect(mocks.syncThread).toHaveBeenCalledWith('thread-1', 'project-1', {
			source: 'canvas_action_button',
			origin: 'internal',
		});
		expect(getPendingWorkflowAttachment('thread-1')).toEqual({
			type: 'workflow',
			id: 'wf-1',
			name: 'My Workflow',
		});
		expect(consumePendingFirstMessage('thread-1')).toBeNull();
		expect(consumePendingRedirectLanding('thread-1')).toBe(false);
	});

	it('stashes a one-shot landing marker for a workflow-list auto redirect', async () => {
		const threadId = await provisionWorkflowThread(
			'project-1',
			{ type: 'workflow', id: 'wf-1', name: 'My Workflow' },
			{ source: 'workflow_list_auto', origin: 'internal', sourceContext: { workflowId: 'wf-1' } },
		);

		expect(threadId).toBe('thread-1');
		expect(consumePendingRedirectLanding('thread-1')).toBe(true);
		expect(consumePendingRedirectLanding('thread-1')).toBe(false);
	});

	it('opens a workflow thread without sending a message', async () => {
		const { openWorkflowThread } = useInstanceAiHandoff();
		const prepare = vi.fn();

		const opened = await openWorkflowThread(
			'project-1',
			{ type: 'workflow', id: 'wf-1', name: 'My Workflow' },
			{ source: 'canvas_action_button', origin: 'internal' },
			prepare,
		);

		expect(opened).toBe(true);
		expect(prepare).toHaveBeenCalledWith('thread-1');
		expect(mocks.sendMessage).not.toHaveBeenCalled();
		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: 'InstanceAiThread',
			params: { threadId: 'thread-1' },
		});
		expect(getPendingWorkflowAttachment('thread-1')).toEqual({
			type: 'workflow',
			id: 'wf-1',
			name: 'My Workflow',
		});
	});

	it('openThreadForDraft stashes the workflow attachment without an opening message', async () => {
		const { openThreadForDraft } = useInstanceAiHandoff();
		const setPendingHandoff = vi.fn();
		mocks.getOrCreateRuntime.mockReturnValue({
			sendMessage: mocks.sendMessage,
			setPendingHandoff,
		});

		const threadId = await openThreadForDraft('project-1', {
			id: 'wf-1',
			name: 'My Workflow',
			snapshot: { id: 'wf-1', name: 'My Workflow' } as never,
		});

		expect(threadId).toBe('thread-1');
		expect(getPendingWorkflowAttachment('thread-1')).toEqual({
			type: 'workflow',
			id: 'wf-1',
			name: 'My Workflow',
		});
		expect(consumePendingFirstMessage('thread-1')).toBeNull();
		expect(setPendingHandoff).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			workflow: { id: 'wf-1', name: 'My Workflow' },
		});
		expect(mocks.sendMessage).not.toHaveBeenCalled();
	});

	// A stashed opener is always n8n-authored -- every stash comes from a hand-off.
	// Reporting it as user-typed would be the misclassification the type prevents.
	it('replays an opening message stashed by a previous deploy as an untyped pre-fill', () => {
		localStorage.setItem(
			'n8n-instance-ai-first-message:thread-1',
			JSON.stringify({ message: 'Set up the credential' }),
		);

		expect(consumePendingFirstMessage('thread-1')).toEqual({
			message: 'Set up the credential',
			authorship: { kind: 'prefill', prefillType: INSTANCE_AI_PREFILL_TYPE_FALLBACK },
		});
	});

	// The draft is text the user is about to send, so an unreadable envelope must
	// not discard it.
	it('keeps a composer draft whose stored envelope is unusable', () => {
		localStorage.setItem('n8n-instance-ai-composer-draft:thread-1', JSON.stringify({ nope: 1 }));

		expect(getPendingComposerDraft('thread-1')).toEqual({
			text: JSON.stringify({ nope: 1 }),
			prefillType: INSTANCE_AI_PREFILL_TYPE_FALLBACK,
		});
	});

	// A retired or mistyped value must not cost the user their draft text, and must
	// certainly not put the raw envelope in the composer for them to send.
	it('keeps the draft text when the stored pre-fill type is not recognised', () => {
		localStorage.setItem(
			'n8n-instance-ai-composer-draft:thread-1',
			JSON.stringify({ text: 'Fix the failed tool calls', prefillType: 'retired_catalog' }),
		);

		expect(getPendingComposerDraft('thread-1')).toEqual({
			text: 'Fix the failed tool calls',
			prefillType: INSTANCE_AI_PREFILL_TYPE_FALLBACK,
		});
	});

	it('round-trips a composer draft stashed under the fallback type', () => {
		stashPendingComposerDraft('thread-1', {
			text: 'Fix the failed tool calls',
			prefillType: INSTANCE_AI_PREFILL_TYPE_FALLBACK,
		});

		expect(getPendingComposerDraft('thread-1')).toEqual({
			text: 'Fix the failed tool calls',
			prefillType: INSTANCE_AI_PREFILL_TYPE_FALLBACK,
		});
	});

	it('drops a stashed opening message without consuming it', () => {
		stashPendingFirstMessage('thread-1', {
			message: 'Set up the credential',
			authorship: { kind: 'prefill', prefillType: 'handoff_credential_setup' },
		});

		clearPendingFirstMessage('thread-1');

		expect(consumePendingFirstMessage('thread-1')).toBeNull();
	});

	it('round-trips an opening message with its attachments so a refused send can requeue it', () => {
		const payload: PendingFirstMessage = {
			message: 'Fix this workflow',
			authorship: { kind: 'prefill', prefillType: 'handoff_credential_setup' },
			attachments: [{ type: 'agent', id: 'agent-1', projectId: 'project-1' }],
			context: buildInstanceAiAgentPreviewHandoffContext({
				agentId: 'agent-1',
				threadId: 'preview-thread-1',
			}),
		};
		stashPendingFirstMessage('thread-1', payload);

		// Mirrors the thread view: consume, send, and on refusal put the payload back intact.
		const consumed = consumePendingFirstMessage('thread-1');
		expect(consumed).toEqual(payload);
		expect(consumePendingFirstMessage('thread-1')).toBeNull();

		stashPendingFirstMessage('thread-1', consumed!);

		expect(consumePendingFirstMessage('thread-1')).toEqual(payload);
	});

	it('mints a thread bound to a non-pending agent subject', async () => {
		const threadId = await provisionSubjectThread(
			{ type: 'agent', id: 'agent-1', projectId: 'project-1', name: 'Support agent' },
			{ source: 'agent_builder_page', origin: 'internal' },
		);

		expect(threadId).toBe('thread-1');
		expect(mocks.syncThread).toHaveBeenCalledWith('thread-1', 'project-1', {
			source: 'agent_builder_page',
			origin: 'internal',
		});
		expect(mocks.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
			instanceAiAgentBuilderTarget: {
				agentId: 'agent-1',
				projectId: 'project-1',
				name: 'Support agent',
			},
		});
		expect(getPendingAgentAttachment('thread-1')).toEqual({
			type: 'agent',
			id: 'agent-1',
			projectId: 'project-1',
			name: 'Support agent',
		});
	});

	it('mints a thread with a pending marker for a pending agent subject, merging extra metadata into the same write', async () => {
		const threadId = await provisionSubjectThread(
			{ type: 'agent', id: 'agent-1', projectId: 'project-1', pending: true },
			{ source: 'agent_builder_page', origin: 'internal' },
			{ instanceAiAgentPreviewView: { agentId: 'agent-1', threadId: 'preview-1' } },
		);

		expect(threadId).toBe('thread-1');
		expect(mocks.updateThreadMetadata).toHaveBeenCalledExactlyOnceWith('thread-1', {
			instanceAiPendingAgentTarget: { projectId: 'project-1', agentId: 'agent-1' },
			instanceAiAgentPreviewView: { agentId: 'agent-1', threadId: 'preview-1' },
		});
	});

	it('deletes the thread and rethrows when the target metadata write fails, without a second toast', async () => {
		mocks.updateThreadMetadata.mockRejectedValueOnce(new Error('Save failed'));

		await expect(
			provisionSubjectThread(
				{ type: 'agent', id: 'agent-1', projectId: 'project-1' },
				{ source: 'agent_builder_page', origin: 'internal' },
			),
		).rejects.toThrow('Save failed');
		expect(mocks.deleteThread).toHaveBeenCalledWith('thread-1', { silent: true });
		expect(mocks.showError).not.toHaveBeenCalled();
	});

	describe('before setup is finished', () => {
		beforeEach(() => {
			mocks.instanceAiReady.value = false;
		});

		it('routes startThread to the assistant instead of sending the opening turn', async () => {
			const { startThread } = useInstanceAiHandoff();

			await startThread(
				'project-1',
				'Fix my workflow',
				{ kind: 'prefill', prefillType: 'handoff_execution_error' },
				{ source: 'canvas_action_button', origin: 'internal' },
			);

			expect(mocks.syncThread).not.toHaveBeenCalled();
			expect(mocks.sendMessage).not.toHaveBeenCalled();
			expect(mocks.routerPush).toHaveBeenCalledWith({ name: 'InstanceAi' });
		});

		it('routes openThreadWithContext to the assistant without minting a thread', async () => {
			const { openThreadWithContext } = useInstanceAiHandoff();

			const opened = await openThreadWithContext(
				'project-1',
				buildInstanceAiCredentialHandoffContext({
					credentialType: 'gmailOAuth2',
					displayName: 'Gmail OAuth2 API',
				}),
				{ source: 'credential_edit', origin: 'internal' },
				{ newTab: true },
			);

			expect(opened).toBe(false);
			expect(mocks.syncThread).not.toHaveBeenCalled();
			expect(mocks.routerPush).toHaveBeenCalledWith({ name: 'InstanceAi' });
		});

		it('routes openWorkflowThread to the assistant without minting a thread', async () => {
			const { openWorkflowThread } = useInstanceAiHandoff();

			const opened = await openWorkflowThread(
				'project-1',
				{ type: 'workflow', id: 'wf-1', name: 'My Workflow' },
				{ source: 'canvas_action_button', origin: 'internal' },
			);

			expect(opened).toBe(false);
			expect(mocks.syncThread).not.toHaveBeenCalled();
			expect(mocks.routerPush).toHaveBeenCalledWith({ name: 'InstanceAi' });
		});
	});
});
