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
	emits: ['import:skill', 'update:skill', 'update:valid'],
	props: ['skill', 'selectedPath', 'showValidationWarnings', 'errors', 'scrollable'],
	setup(props, { emit }) {
		const valid = ref(true);
		onMounted(() => emit('update:valid', valid.value));
		return () => h('div', { 'data-testid': 'agent-skill-viewer-stub' }, props.selectedPath);
	},
});

const MODAL_NAME = 'AgentSkillModal';

function renderModal({
	onConfirm = vi.fn(),
	skill,
}: {
	onConfirm?: (payload: { id?: string; skill: AgentSkill }) => void;
	skill?: AgentSkill;
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
				N8nIcon: { template: '<i />' },
				N8nText: { template: '<span><slot /></span>' },
			},
		},
	});
	return renderComponent({
		props: {
			modalName: MODAL_NAME,
			data: {
				projectId: 'p1',
				agentId: 'a1',
				skill,
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

	it('switches the selected editor file from SKILL.md to a reference', async () => {
		const { container, getByText } = renderModal({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
						bytes: 7,
						sha256: 'a'.repeat(64),
					},
				],
			},
		});

		expect(container.querySelector('[data-testid="agent-skill-viewer-stub"]')).toHaveTextContent(
			'SKILL.md',
		);

		await fireEvent.click(getByText('references/guide.md'));

		expect(container.querySelector('[data-testid="agent-skill-viewer-stub"]')).toHaveTextContent(
			'references/guide.md',
		);
	});

	it('adds a blank reference from the references section action', async () => {
		const { container } = renderModal({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
			},
		});

		const addReferenceButton = container.querySelector('[data-testid="agent-skill-add-reference"]');
		expect(addReferenceButton).toBeInTheDocument();

		await fireEvent.click(addReferenceButton as Element);

		expect(
			container.querySelector(
				'[data-testid="agent-skill-reference-nav-item-references-reference-md"]',
			),
		).toHaveTextContent('references/reference.md');
		expect(container.querySelector('[data-testid="agent-skill-viewer-stub"]')).toHaveTextContent(
			'references/reference.md',
		);
	});

	it('removes a reference from the references section action', async () => {
		const { container, getByText } = renderModal({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
						bytes: 7,
						sha256: 'a'.repeat(64),
					},
				],
			},
		});

		await fireEvent.click(getByText('references/guide.md'));
		await fireEvent.click(
			container.querySelector(
				'[data-testid="agent-skill-reference-nav-item-references-guide-md-remove"]',
			) as Element,
		);

		expect(
			container.querySelector('[data-testid="agent-skill-reference-nav-item-references-guide-md"]'),
		).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="agent-skill-viewer-stub"]')).toHaveTextContent(
			'SKILL.md',
		);
	});
});
