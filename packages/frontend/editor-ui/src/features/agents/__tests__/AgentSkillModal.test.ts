import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { fireEvent } from '@testing-library/vue';
import { defineComponent, h, onMounted, watch } from 'vue';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
} from '@n8n/api-types';

import AgentSkillModal from '../components/AgentSkillModal.vue';
import type { AgentSkill } from '../types';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const apiCreateSpy = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	createAgentSkill: (...args: unknown[]) => apiCreateSpy(...args),
}));

const { showMessage } = vi.hoisted(() => ({ showMessage: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage }),
}));

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
					props.skill?.instructions?.trim() &&
					props.skill.instructions.length <= AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
			);
		}
		onMounted(() => emit('update:valid', computeValid()));
		watch(
			() => props.skill,
			() => emit('update:valid', computeValid()),
		);
		return () =>
			h('div', { 'data-testid': 'agent-skill-viewer-stub' }, [
				h('span', props.selectedPath),
				h(
					'span',
					{ 'data-testid': 'agent-skill-instructions-error' },
					props.errors?.instructions ?? '',
				),
			]);
	},
});

const MODAL_NAME = 'AgentSkillModal';

function renderModal({
	onConfirm = vi.fn(),
	skill,
	skillId,
	availableTools,
	existingSkillNames,
}: {
	onConfirm?: (payload: { id?: string; skill: AgentSkill }) => void;
	skill?: AgentSkill;
	skillId?: string;
	availableTools?: Array<{ name: string; label: string }>;
	existingSkillNames?: string[];
} = {}) {
	const renderComponent = createComponentRenderer(AgentSkillModal, {
		global: {
			stubs: {
				AgentModal: AgentModalTestStub,
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
				existingSkillNames,
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

	it('uses the wider fit-content Agent modal width', () => {
		const { container } = renderModal();

		expect(container.querySelector('[data-testid="agent-skill-modal"]')).toHaveAttribute(
			'data-size',
			'fit',
		);
	});

	it('does not call createAgentSkill when the user closes before saving', async () => {
		const onConfirm = vi.fn();
		const { container } = renderModal({ onConfirm });

		await fireEvent.click(
			container.querySelector('[data-testid="dialog-close-button"]') as Element,
		);

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
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('uses the next available default name for a new skill', () => {
		const { container } = renderModal({
			existingSkillNames: [
				'agents.builder.skills.defaultName',
				'agents.builder.skills.defaultName 2',
			],
		});

		expect(container.querySelector('[data-testid="agent-modal-title-input"]')).toHaveValue(
			'agents.builder.skills.defaultName 3',
		);
	});

	it('explains why overlong instructions cannot be saved', async () => {
		const onConfirm = vi.fn();
		const { container } = renderModal({
			onConfirm,
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'x'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH + 1),
			},
		});

		await fireEvent.click(
			container.querySelector('[data-testid="agent-skill-create-save"]') as Element,
		);

		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.closeModal).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
		expect(
			container.querySelector('[data-testid="agent-skill-instructions-error"]'),
		).toHaveTextContent('agents.builder.skills.validation.instructionsMaxLength');
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
