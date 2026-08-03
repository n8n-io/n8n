import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { fireEvent } from '@testing-library/vue';
import { defineComponent, h, onMounted, watch } from 'vue';
import { AGENT_SKILL_REFERENCE_MAX_COUNT } from '@n8n/api-types';

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
		// Mirrors the real viewer's required-fields check closely enough for
		// modal-level tests: a skill without a name/description/instructions
		// can't be valid, so Save must stay blocked for it.
		function computeValid() {
			return Boolean(
				props.skill?.name?.trim() &&
					props.skill?.description?.trim() &&
					props.skill?.instructions?.trim(),
			);
		}
		onMounted(() => emit('update:valid', computeValid()));
		watch(
			() => props.skill,
			() => emit('update:valid', computeValid()),
		);
		return () =>
			h('div', { 'data-testid': 'agent-skill-viewer-stub' }, [h('span', props.selectedPath)]);
	},
});

const MODAL_NAME = 'AgentSkillModal';

function renderModal({
	onConfirm = vi.fn(),
	skill,
	skillId,
	availableTools,
}: {
	onConfirm?: (payload: { id?: string; skill: AgentSkill }) => void;
	skill?: AgentSkill;
	skillId?: string;
	availableTools?: Array<{ name: string; label: string }>;
} = {}) {
	const renderComponent = createComponentRenderer(AgentSkillModal, {
		global: {
			stubs: {
				Modal: ModalStub,
				AgentSkillViewer: SkillViewerStub,
				N8nButton: {
					template: '<button v-bind="$attrs" :disabled="disabled"><slot /></button>',
					props: ['variant', 'disabled'],
				},
				N8nCallout: { template: '<div v-bind="$attrs"><slot /></div>' },
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
				skillId,
				availableTools,
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

	it('shows the missing-content callout and blocks saving a skill without a body', async () => {
		const onConfirm = vi.fn();
		const { container } = renderModal({
			onConfirm,
			skillId: 'ghost',
			skill: { name: 'ghost', description: '', instructions: '' },
		});

		expect(
			container.querySelector('[data-testid="agent-skill-missing-content-callout"]'),
		).toBeInTheDocument();

		await fireEvent.click(
			container.querySelector('[data-testid="agent-skill-create-save"]') as Element,
		);

		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.closeModal).not.toHaveBeenCalled();
	});

	it('adds and removes references from the file navigation', async () => {
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

		await fireEvent.click(
			container.querySelector(
				'[data-testid="agent-skill-reference-nav-item-references-reference-md-remove"]',
			) as Element,
		);

		expect(
			container.querySelector(
				'[data-testid="agent-skill-reference-nav-item-references-reference-md"]',
			),
		).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="agent-skill-viewer-stub"]')).toHaveTextContent(
			'SKILL.md',
		);
	});

	it('does not add more than the maximum number of references', async () => {
		const { container } = renderModal({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: makeReferences(AGENT_SKILL_REFERENCE_MAX_COUNT),
			},
		});

		const addReferenceButton = container.querySelector(
			'[data-testid="agent-skill-add-reference"]',
		) as HTMLButtonElement;

		expect(addReferenceButton).toBeDisabled();
		await fireEvent.click(addReferenceButton);

		expect(
			container.querySelector(
				'[data-testid="agent-skill-reference-nav-item-references-reference-21-md"]',
			),
		).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="agent-skill-viewer-stub"]')).toHaveTextContent(
			'SKILL.md',
		);
	});
});

function makeReferences(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		path: index === 0 ? 'references/reference.md' : `references/reference-${index + 1}.md`,
		content: 'Reference',
	}));
}
