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

import {
	buildInstanceAiAgentPreviewHandoffContext,
	buildInstanceAiCredentialHandoffContext,
	clearPendingAgentAttachment,
	clearPendingComposerDraft,
	clearPendingFirstMessage,
	clearPendingHandoffContext,
	clearPendingThreadHandoff,
	consumePendingFirstMessage,
	getPendingAgentAttachment,
	getPendingComposerDraft,
	getPendingHandoffContext,
	provisionContextOnlyThread,
	stashPendingAgentAttachment,
	stashPendingComposerDraft,
	stashPendingFirstMessage,
	stashPendingHandoffContext,
	useInstanceAiHandoff,
} from '../composables/useInstanceAiHandoff';
import type { PendingFirstMessage } from '../composables/useInstanceAiHandoff';

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

	it('keeps a pending composer draft until it is explicitly cleared', () => {
		stashPendingComposerDraft('thread-1', 'Fix this tool failure');

		expect(getPendingComposerDraft('thread-1')).toBe('Fix this tool failure');
		expect(getPendingComposerDraft('thread-1')).toBe('Fix this tool failure');
		clearPendingComposerDraft('thread-1');
		expect(getPendingComposerDraft('thread-1')).toBeNull();
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

		const threadId = await provisionContextOnlyThread(
			'project-1',
			context,
			launch,
			'Fix this tool failure',
		);

		expect(threadId).toBe('thread-1');
		expect(mocks.syncThread).toHaveBeenCalledWith('thread-1', 'project-1', launch);
		expect(getPendingHandoffContext('thread-1')).toEqual(context);
		expect(getPendingComposerDraft('thread-1')).toBe('Fix this tool failure');
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
		stashPendingComposerDraft('thread-1', 'Fix the failed tool calls');
		stashPendingAgentAttachment('thread-1', {
			type: 'agent',
			id: 'agent-1',
			projectId: 'project-1',
		});

		stashPendingFirstMessage('thread-1', { message: 'Set up the credential' });

		clearPendingThreadHandoff('thread-1');

		expect(getPendingHandoffContext('thread-1')).toBeNull();
		expect(getPendingComposerDraft('thread-1')).toBeNull();
		expect(getPendingAgentAttachment('thread-1')).toBeNull();
		// A thread that disappears before its opening message is replayed must not leave the
		// payload behind: nothing would ever consume it again.
		expect(consumePendingFirstMessage('thread-1')).toBeNull();
	});

	it('drops a stashed opening message without consuming it', () => {
		stashPendingFirstMessage('thread-1', { message: 'Set up the credential' });

		clearPendingFirstMessage('thread-1');

		expect(consumePendingFirstMessage('thread-1')).toBeNull();
	});

	it('round-trips an opening message with its attachments so a refused send can requeue it', () => {
		const payload: PendingFirstMessage = {
			message: 'Fix this workflow',
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

	it('opens an agent artifact thread without sending a message', async () => {
		const { openAgentArtifactThread } = useInstanceAiHandoff();
		const context = buildInstanceAiAgentPreviewHandoffContext({
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			executionId: 'execution-1',
		});

		const opened = await openAgentArtifactThread(
			{
				type: 'agent',
				id: 'agent-1',
				name: 'Agent One',
				projectId: 'project-1',
			},
			{
				source: 'agent_builder_page',
				origin: 'internal',
				sourceContext: { agentId: 'agent-1' },
			},
			{ context, initialDraft: 'Fix the failed tool calls' },
		);

		expect(opened).toBe(true);
		expect(mocks.syncThread).toHaveBeenCalledWith('thread-1', 'project-1', {
			source: 'agent_builder_page',
			origin: 'internal',
			sourceContext: { agentId: 'agent-1' },
		});
		expect(mocks.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
			instanceAiAgentBuilderTarget: {
				agentId: 'agent-1',
				projectId: 'project-1',
				name: 'Agent One',
			},
			instanceAiAgentPreviewView: {
				agentId: 'agent-1',
				threadId: 'preview-thread-1',
			},
		});
		expect(getPendingAgentAttachment('thread-1')).toEqual({
			type: 'agent',
			id: 'agent-1',
			name: 'Agent One',
			projectId: 'project-1',
		});
		expect(getPendingHandoffContext('thread-1')).toEqual(context);
		expect(getPendingComposerDraft('thread-1')).toBe('Fix the failed tool calls');
		expect(mocks.getOrCreateRuntime).not.toHaveBeenCalled();
		expect(mocks.sendMessage).not.toHaveBeenCalled();
		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: 'InstanceAiThread',
			params: { threadId: 'thread-1' },
		});
	});

	it('clears pending agent handoff state when navigation fails', async () => {
		mocks.routerPush.mockRejectedValueOnce(new Error('Navigation failed'));
		const context = buildInstanceAiAgentPreviewHandoffContext({
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
		});
		const { openAgentArtifactThread } = useInstanceAiHandoff();

		const opened = await openAgentArtifactThread(
			{ type: 'agent', id: 'agent-1', projectId: 'project-1' },
			{ source: 'agent_preview', origin: 'internal' },
			{ context, initialDraft: 'Fix the failed tool calls' },
		);

		expect(opened).toBe(false);
		expect(getPendingAgentAttachment('thread-1')).toBeNull();
		expect(getPendingHandoffContext('thread-1')).toBeNull();
		expect(getPendingComposerDraft('thread-1')).toBeNull();
		expect(mocks.deleteThread).toHaveBeenCalledWith('thread-1');
		expect(mocks.showError).toHaveBeenCalled();
	});

	it('removes the new thread when artifact metadata cannot be saved', async () => {
		mocks.updateThreadMetadata.mockRejectedValueOnce(new Error('Save failed'));
		const { openAgentArtifactThread } = useInstanceAiHandoff();

		const opened = await openAgentArtifactThread(
			{ type: 'agent', id: 'agent-1', projectId: 'project-1' },
			{ source: 'agent_preview', origin: 'internal' },
		);

		expect(opened).toBe(false);
		expect(mocks.deleteThread).toHaveBeenCalledWith('thread-1');
		expect(mocks.routerPush).not.toHaveBeenCalled();
	});

	describe('before setup is finished', () => {
		beforeEach(() => {
			mocks.instanceAiReady.value = false;
		});

		it('routes startThread to the assistant instead of sending the opening turn', async () => {
			const { startThread } = useInstanceAiHandoff();

			await startThread('project-1', 'Fix my workflow', {
				source: 'canvas_action_button',
				origin: 'internal',
			});

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

		it('routes openAgentArtifactThread to the assistant without minting a thread', async () => {
			const { openAgentArtifactThread } = useInstanceAiHandoff();

			const opened = await openAgentArtifactThread(
				{ type: 'agent', id: 'agent-1', projectId: 'project-1' },
				{ source: 'agent_preview', origin: 'internal' },
			);

			expect(opened).toBe(false);
			expect(mocks.syncThread).not.toHaveBeenCalled();
			expect(mocks.routerPush).toHaveBeenCalledWith({ name: 'InstanceAi' });
		});
	});
});
