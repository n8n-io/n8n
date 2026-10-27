import { configure, fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

import AgentUnpublishedWorkflowsModal from '../components/AgentUnpublishedWorkflowsModal.vue';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const routerResolve = vi.fn((to: { name: string; params: { workflowId: string } }) => ({
	href: `/workflow/${to.params.workflowId}`,
}));
vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: routerResolve }),
}));

const stubs = {
	AgentModal: AgentModalTestStub,
	N8nText: { template: '<span><slot /></span>' },
	N8nButton: {
		template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
	},
	N8nIcon: { template: '<span />' },
};

const MODAL_NAME = 'agentUnpublishedWorkflows';

describe('AgentUnpublishedWorkflowsModal', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		routerResolve.mockClear();
		const uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
	});

	it('lists unpublished workflows with real links to the editor', async () => {
		const { getAllByTestId, getByTestId } = createComponentRenderer(
			AgentUnpublishedWorkflowsModal,
			{
				global: { stubs },
			},
		)({
			props: {
				modalName: MODAL_NAME,
				data: {
					workflows: [
						{ name: 'Daily lookup', workflowId: 'wf_1' },
						{ name: 'Legacy by-name reference' },
					],
				},
			},
		});

		const links = getAllByTestId('agent-unpublished-workflow-link');
		expect(links).toHaveLength(1);
		expect(links[0]).toHaveTextContent('Daily lookup');
		// Real anchors: focusable, exposed as links, opened in a new tab.
		expect(links[0]).toHaveAttribute('href', '/workflow/wf_1');
		expect(links[0]).toHaveAttribute('target', '_blank');
		expect(links[0]).toHaveAttribute('rel', 'noopener');
		expect(routerResolve).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf_1' },
		});
		// A by-name reference has no stable id, so it renders as plain text.
		expect(getByTestId('agent-unpublished-workflows-list')).toHaveTextContent(
			'Legacy by-name reference',
		);
	});

	it('closes on "Got it"', async () => {
		const { getByTestId } = createComponentRenderer(AgentUnpublishedWorkflowsModal, {
			global: { stubs },
		})({
			props: {
				modalName: MODAL_NAME,
				data: { workflows: [{ name: 'Daily lookup', workflowId: 'wf_1' }] },
			},
		});

		await fireEvent.click(getByTestId('agent-unpublished-workflows-got-it'));

		expect(mockedStore(useUIStore).closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});
});
