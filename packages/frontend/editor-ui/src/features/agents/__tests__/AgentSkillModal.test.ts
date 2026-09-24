import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
} from '@n8n/api-types';

import AgentSkillModal from '../components/AgentSkillModal.vue';
import type { AgentSkill } from '../types';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

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

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackImportedSkill: vi.fn() }),
}));

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
				MarkdownEditor: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template: `<textarea :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
				},
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
		expect(container.querySelector('[data-testid="agent-skill-modal"]')).toHaveAttribute(
			'data-body-flush',
			'true',
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
		expect(container.querySelector('h2')).toHaveTextContent('agents.builder.skills.edit');
		expect(container.querySelector('[data-testid="agent-modal-back"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="agent-skill-upload"]')).not.toBeInTheDocument();

		await fireEvent.click(
			container.querySelector('[data-testid="agent-skill-create-save"]') as Element,
		);

		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.closeModal).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('starts with upload and discards manual changes on Back', async () => {
		const { getByTestId, queryByTestId } = renderModal();

		expect(getByTestId('agent-skill-upload')).toBeInTheDocument();
		expect(queryByTestId('agent-skill-viewer')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		const nameInput = getByTestId('agent-skill-name-input').querySelector('input')!;
		expect(nameInput).toHaveValue('');
		await fireEvent.update(nameInput, 'Draft skill');
		await fireEvent.click(getByTestId('agent-skill-add-reference'));
		await fireEvent.update(getByTestId('agent-skill-reference-editor'), 'Draft reference');
		await fireEvent.click(getByTestId('agent-modal-back'));

		expect(getByTestId('agent-skill-upload')).toBeInTheDocument();
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		expect(getByTestId('agent-skill-name-input').querySelector('input')).toHaveValue('');
		expect(
			queryByTestId('agent-skill-reference-nav-item-references-reference-md'),
		).not.toBeInTheDocument();
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
		expect(container.querySelector('[data-testid="agent-skill-viewer"]')).toHaveTextContent(
			'agents.builder.skills.validation.instructionsMaxLength',
		);
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
		expect(
			container.querySelector('[data-testid="agent-skill-reference-name-input"] input'),
		).toHaveValue('reference');

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
		expect(
			container.querySelector('[data-testid="agent-skill-instructions-editor"]'),
		).toBeInTheDocument();
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
		expect(
			container.querySelector('[data-testid="agent-skill-instructions-editor"]'),
		).toBeInTheDocument();
	});

	it('opens the editor after import and saves only when confirmed', async () => {
		const onConfirm = vi.fn();
		const { getByTestId, queryByTestId } = renderModal({ onConfirm });
		const file = new File(
			['---\nname: Research\ndescription: Use for research\n---\nMain instructions'],
			'SKILL.md',
		);

		await fireEvent.change(getByTestId('agent-skill-skill-md-file-input'), {
			target: { files: [file] },
		});
		await waitFor(() => expect(getByTestId('agent-skill-viewer')).toBeInTheDocument());

		expect(queryByTestId('agent-skill-upload')).not.toBeInTheDocument();
		expect(queryByTestId('agent-modal-back')).not.toBeInTheDocument();
		expect(onConfirm).not.toHaveBeenCalled();
		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).toHaveBeenCalledWith({
			id: undefined,
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main instructions',
			},
		});
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('validates a manual skill and saves its edited reference', async () => {
		const onConfirm = vi.fn();
		const { getByTestId } = renderModal({ onConfirm });
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		await fireEvent.click(getByTestId('agent-skill-create-save'));
		expect(onConfirm).not.toHaveBeenCalled();

		await fireEvent.update(
			getByTestId('agent-skill-name-input').querySelector('input')!,
			' Research ',
		);
		await fireEvent.update(
			getByTestId('agent-skill-description-input').querySelector('input')!,
			'Use for research',
		);
		await fireEvent.update(getByTestId('agent-skill-instructions-editor'), 'Read the guide');
		await fireEvent.click(getByTestId('agent-skill-add-reference'));
		await fireEvent.click(getByTestId('agent-skill-create-save'));
		expect(onConfirm).not.toHaveBeenCalled();

		await fireEvent.update(
			getByTestId('agent-skill-reference-name-input').querySelector('input')!,
			'guide',
		);
		await fireEvent.update(getByTestId('agent-skill-reference-editor'), '# Guide');
		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).toHaveBeenCalledWith({
			id: undefined,
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Read the guide',
				references: [{ path: 'references/guide.md', content: '# Guide' }],
			},
		});
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});
});

function makeReferences(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		path: index === 0 ? 'references/reference.md' : `references/reference-${index + 1}.md`,
		content: 'Reference',
	}));
}
