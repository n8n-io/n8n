import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { fireEvent } from '@testing-library/vue';
import { defineComponent, h, onMounted, ref } from 'vue';

import AgentSkillModal from '../components/AgentSkillModal.vue';
import type { AgentSkill } from '../types';

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const apiCreateSpy = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	createAgentSkill: (...args: unknown[]) => apiCreateSpy(...args),
}));

const ModalStub = defineComponent({
	props: ['name', 'customClass', 'width'],
	template: `
		<div role="dialog">
			<slot name="header" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
});

const SkillViewerStub = defineComponent({
	emits: ['update:skill', 'update:valid'],
	props: ['skill', 'showValidationWarnings', 'errors', 'scrollable'],
	setup(_, { emit }) {
		const valid = ref(true);
		onMounted(() => emit('update:valid', valid.value));
		return () => h('div', { 'data-testid': 'agent-skill-viewer-stub' });
	},
});

const MODAL_NAME = 'AgentSkillModal';

function renderModal({
	onConfirm = vi.fn(),
}: {
	onConfirm?: (payload: { id?: string; skill: AgentSkill }) => void;
} = {}) {
	const renderComponent = createComponentRenderer(AgentSkillModal, {
		global: {
			stubs: {
				Modal: ModalStub,
				AgentSkillViewer: SkillViewerStub,
				N8nButton: {
					template: '<button v-bind="$attrs"><slot /></button>',
					props: ['variant', 'disabled'],
				},
				N8nHeading: { template: '<h2><slot /></h2>' },
			},
		},
	});
	return renderComponent({
		props: {
			modalName: MODAL_NAME,
			data: {
				projectId: 'p1',
				agentId: 'a1',
				onConfirm,
			},
		},
	});
}

describe('AgentSkillModal', () => {
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
	});

	it('does not call createAgentSkill when the user cancels before saving', async () => {
		const onConfirm = vi.fn();
		const { getByText } = renderModal({ onConfirm });

		await fireEvent.click(getByText('agents.builder.skills.create.cancel'));

		expect(apiCreateSpy).not.toHaveBeenCalled();
		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});
});
