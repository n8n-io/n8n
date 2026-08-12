import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { VIEWS } from '@/app/constants';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';

const { routeState, modalState } = vi.hoisted(() => ({
	routeState: {
		name: 'NodeViewExisting' as string,
		params: { workflowId: 'wf-1' } as Record<string, string>,
		query: {} as Record<string, string>,
	},
	modalState: {
		open: false,
		mode: null as string | null,
		activeId: null as string | null,
	},
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => routeState,
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		get modalsById() {
			return { editCredential: { ...modalState } };
		},
	}),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({
		getWorkflowById: (id: string) =>
			id === 'wf-1' ? { id: 'wf-1', name: 'Weekly Pipeline' } : undefined,
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		getCredentialById: (id: string) =>
			id === 'cred-1' ? { id: 'cred-1', name: 'Slack account', type: 'slackOAuth2Api' } : undefined,
		getCredentialTypeByName: (name: string) =>
			name === 'slackOAuth2Api'
				? { name: 'slackOAuth2Api', displayName: 'Slack OAuth2 API' }
				: undefined,
	}),
}));

import { useInstanceAiPageContext } from '../useInstanceAiPageContext';

describe('useInstanceAiPageContext', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		routeState.name = VIEWS.WORKFLOW;
		routeState.params = { workflowId: 'wf-1' };
		routeState.query = {};
		modalState.open = false;
		modalState.mode = null;
		modalState.activeId = null;
	});

	it('attaches the current workflow on the workflow editor', () => {
		const { attachments, chips } = useInstanceAiPageContext();

		expect(attachments.value).toEqual([{ type: 'workflow', id: 'wf-1', name: 'Weekly Pipeline' }]);
		expect(chips.value).toEqual([
			expect.objectContaining({
				key: 'workflow:wf-1',
				label: 'Weekly Pipeline',
				icon: 'workflow',
			}),
		]);
	});

	it('skips workflow context on a new unsaved canvas', () => {
		routeState.params = { workflowId: 'client-minted-id' };
		routeState.query = { new: 'true' };

		const { attachments, chips } = useInstanceAiPageContext();

		expect(attachments.value).toEqual([]);
		expect(chips.value).toEqual([]);
	});

	it('includes executionId on execution preview routes', () => {
		routeState.name = VIEWS.EXECUTION_PREVIEW;
		routeState.params = { workflowId: 'wf-1', executionId: 'exec-9' };

		const { attachments } = useInstanceAiPageContext();

		expect(attachments.value).toEqual([
			{
				type: 'workflow',
				id: 'wf-1',
				name: 'Weekly Pipeline',
				executionId: 'exec-9',
			},
		]);
	});

	it('attaches an open credential as handoff context', () => {
		routeState.name = VIEWS.CREDENTIALS;
		routeState.params = {};
		modalState.open = true;
		modalState.mode = 'edit';
		modalState.activeId = 'cred-1';

		const { handoffContext, chips, attachments } = useInstanceAiPageContext();

		expect(attachments.value).toEqual([]);
		expect(handoffContext.value).toEqual({
			source: 'credential-modal',
			credential: {
				credentialType: 'slackOAuth2Api',
				displayName: 'Slack account',
				id: 'cred-1',
			},
		});
		expect(chips.value).toEqual([
			expect.objectContaining({
				label: 'Slack account',
				icon: 'key-round',
			}),
		]);
	});

	it('attaches the current agent on the agent builder', () => {
		routeState.name = AGENT_BUILDER_VIEW;
		routeState.params = { projectId: 'project-1', agentId: 'agent-1' };

		const { attachments, chips } = useInstanceAiPageContext();

		expect(attachments.value).toEqual([{ type: 'agent', id: 'agent-1', projectId: 'project-1' }]);
		expect(chips.value).toEqual([
			expect.objectContaining({
				key: 'agent:agent-1',
				icon: 'robot',
			}),
		]);
	});

	it('returns nothing on unrelated pages', () => {
		routeState.name = VIEWS.HOMEPAGE;
		routeState.params = {};

		const { attachments, chips, handoffContext } = useInstanceAiPageContext();

		expect(attachments.value).toEqual([]);
		expect(chips.value).toEqual([]);
		expect(handoffContext.value).toBeNull();
	});
});
