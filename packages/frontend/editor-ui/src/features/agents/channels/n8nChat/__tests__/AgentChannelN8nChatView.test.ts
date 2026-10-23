import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { i18nInstance } from '@n8n/i18n';
import { nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';

import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';

import AgentChannelN8nChatView from '../AgentChannelN8nChatView.vue';

const DESCRIPTION_TESTID = 'agent-channel-n8n-chat-description';

const baseProps = (overrides: Record<string, unknown> = {}) => ({
	mode: 'setup' as const,
	modelValue: '',
	integration: {
		type: 'n8n_chat',
		label: 'n8n Chat',
		icon: 'message-circle',
		credentialTypes: [],
	},
	credentials: [],
	credentialPermissions: { create: true },
	credentialsLoading: false,
	loading: false,
	connected: false,
	connectedDescription: '',
	errorMessage: '',
	errorIsConflict: false,
	isPublished: true,
	agentName: 'Agent',
	projectId: 'team-1',
	agentId: 'agent-1',
	forceNewCredential: false,
	simpleSetup: false,
	runtime: { loading: ref(false), load: async () => {} },
	...overrides,
});

/**
 * `I18nT` resolves against the real global i18n instance (scope="global"), and the
 * project lookup runs through the real projects store, so both are installed for real
 * rather than mocked -- this is what makes the callout text and project resolution
 * worth asserting on.
 */
function renderView(
	props: Record<string, unknown> = {},
	configureStore: (store: MockedStore<typeof useProjectsStore>) => void = () => {},
) {
	const pinia = createTestingPinia();
	const projectsStore = mockedStore(useProjectsStore);
	configureStore(projectsStore);

	return mount(AgentChannelN8nChatView, {
		props: baseProps(props),
		global: { plugins: [pinia, i18nInstance] },
	});
}

describe('AgentChannelN8nChatView', () => {
	it('names the team project in the callout', () => {
		const teamProject = createTestProject({
			id: 'team-1',
			name: 'Marketing',
			type: ProjectTypes.Team,
		});

		const wrapper = renderView({ projectId: 'team-1' }, (store) => {
			store.currentProject = teamProject;
			store.personalProject = null;
			store.myProjects = [];
		});

		expect(wrapper.text()).toContain('Marketing');
	});

	it('shows "Personal" for the personal project', () => {
		const personalProject = createTestProject({
			id: 'personal-1',
			type: ProjectTypes.Personal,
		});

		const wrapper = renderView({ projectId: 'personal-1' }, (store) => {
			store.currentProject = null;
			store.personalProject = personalProject;
			store.myProjects = [];
		});

		expect(wrapper.text()).toContain('Personal');
	});

	it('initialises the description from savedDescription and shows the placeholder', () => {
		const wrapper = renderView({ savedDescription: 'Handles support tickets' });

		const textarea = wrapper.get(`[data-testid="${DESCRIPTION_TESTID}"]`);
		expect(textarea.element).toHaveValue('Handles support tickets');
		expect(textarea.attributes('placeholder')).toBe(
			'e.g. Ask me to summarize meetings or draft follow-up notes.',
		);
	});

	it('updates the exposed description as the user types', async () => {
		const wrapper = renderView();

		await wrapper
			.get(`[data-testid="${DESCRIPTION_TESTID}"]`)
			.setValue('Answers billing questions');
		await nextTick();

		expect(wrapper.vm.description).toBe('Answers billing questions');
	});

	it('caps the description at the shared agent description limit', () => {
		const wrapper = renderView();

		const textarea = wrapper.get(`[data-testid="${DESCRIPTION_TESTID}"]`);
		expect(textarea.attributes('maxlength')).toBe('512');
	});
});
