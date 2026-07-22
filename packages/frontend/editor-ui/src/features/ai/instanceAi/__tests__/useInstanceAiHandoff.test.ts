import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	routerPush: vi.fn(),
	syncThread: vi.fn(),
	updateThreadMetadata: vi.fn(),
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
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError }),
}));
vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		syncThread: mocks.syncThread,
		updateThreadMetadata: mocks.updateThreadMetadata,
		getOrCreateRuntime: mocks.getOrCreateRuntime,
	}),
}));

import {
	buildInstanceAiAgentPreviewHandoffContext,
	buildInstanceAiCredentialHandoffContext,
	clearPendingAgentAttachment,
	consumePendingHandoffContext,
	getPendingAgentAttachment,
	stashPendingAgentAttachment,
	stashPendingHandoffContext,
	useInstanceAiHandoff,
} from '../composables/useInstanceAiHandoff';

describe('useInstanceAiHandoff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		mocks.syncThread.mockResolvedValue(undefined);
		mocks.updateThreadMetadata.mockResolvedValue(undefined);
		mocks.getOrCreateRuntime.mockReturnValue({ sendMessage: mocks.sendMessage });
	});

	it('builds credential modal handoff context without empty optional fields', () => {
		expect(
			buildInstanceAiCredentialHandoffContext({
				credentialType: 'gmailOAuth2Api',
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
				credentialType: 'gmailOAuth2Api',
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

	it('stashes and consumes a pending handoff context once', () => {
		const context = buildInstanceAiAgentPreviewHandoffContext({
			agentId: 'agent-1',
			threadId: 'thread-1',
		});

		stashPendingHandoffContext('thread-1', context);

		expect(consumePendingHandoffContext('thread-1')).toEqual(context);
		expect(consumePendingHandoffContext('thread-1')).toBeNull();
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

	it('opens an agent artifact thread without sending a message', async () => {
		const { openAgentArtifactThread } = useInstanceAiHandoff();

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
		});
		expect(getPendingAgentAttachment('thread-1')).toEqual({
			type: 'agent',
			id: 'agent-1',
			name: 'Agent One',
			projectId: 'project-1',
		});
		expect(mocks.getOrCreateRuntime).not.toHaveBeenCalled();
		expect(mocks.sendMessage).not.toHaveBeenCalled();
		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: 'InstanceAiThread',
			params: { threadId: 'thread-1' },
		});
	});
});
