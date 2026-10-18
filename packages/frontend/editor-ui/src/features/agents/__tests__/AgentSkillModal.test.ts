import { AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH } from '@n8n/api-types';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	type SkillDetail,
	type SkillListItem,
} from '@n8n/api-types';

import AgentSkillModal, { type AgentSkillModalData } from '../components/AgentSkillModal.vue';
import type { AgentSkill } from '../types';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', () => {
	const i18n = {
		// Interpolated values follow the key, so a test can check that a file name is shown.
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			if (key === 'agents.builder.skills.defaultName') return 'New skill';
			const values = Object.values(options?.interpolate ?? {});
			return values.length > 0 ? `${key} ${values.join(' ')}` : key;
		},
	};
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const apiCreateSpy = vi.fn();
const { listAttachableSkills, getHubSkill } = vi.hoisted(() => ({
	listAttachableSkills: vi.fn(),
	getHubSkill: vi.fn(),
}));
vi.mock('../composables/useAgentApi', () => ({
	createAgentSkill: (...args: unknown[]) => apiCreateSpy(...args),
	listAttachableSkills,
	getHubSkill,
}));

const { showMessage, showError, trackImportedSkill } = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showError: vi.fn(),
	trackImportedSkill: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('@/features/shared/toolsConnection/ToolsConnectionModal.vue', () => ({
	default: {
		name: 'ToolsConnectionModal',
		props: ['items', 'emptyMessage', 'createAction', 'categories', 'categoryLabels'],
		emits: ['connect', 'disconnect', 'open-detail', 'create'],
		template: `
			<div data-testid="agent-skill-picker">
				<span data-testid="agent-skill-picker-tabs">{{ categories.join(',') }} {{ categoryLabels?.project }}</span>
				<button data-testid="agent-skill-picker-create" @click="$emit('create', 'all')">
					{{ createAction.label }}
				</button>
				<button
					v-for="category in categories"
					:key="category"
					:data-testid="'agent-skill-picker-create-' + category"
					@click="$emit('create', category)"
				/>
				<div v-if="items.length === 0" data-testid="agent-skill-picker-empty">{{ emptyMessage }}</div>
				<div v-for="item in items" :key="item.id" data-testid="agent-skill-picker-row">
					<button data-testid="agent-skill-picker-row-open" @click="$emit('open-detail', item)">{{ item.title }}</button>
					<span data-testid="agent-skill-picker-category">{{ item.category }}</span>
					<span v-if="item.disabled" data-testid="agent-skill-picker-disabled">{{ item.disabledReason }}</span>
					<button v-else data-testid="agent-skill-picker-toggle" :data-attached="String(item.attached)" @click="$emit(item.attached ? 'disconnect' : 'connect', item)" />
				</div>
			</div>
		`,
	},
}));

const { resolveRoute } = vi.hoisted(() => ({
	resolveRoute: vi.fn(() => ({ href: '/settings/context/skills' })),
}));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ resolve: resolveRoute }),
}));

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackImportedSkill }),
}));

const MODAL_NAME = 'AgentSkillModal';

function renderModal({
	onConfirm = vi.fn(),
	skill,
	skillId,
	existingSkillNames,
	settings,
	...hubOptions
}: {
	onConfirm?: AgentSkillModalData['onConfirm'];
	skill?: AgentSkill;
	skillId?: string;
	existingSkillNames?: string[];
	/** Opens the modal as Settings > Context > Skills does: no agent, plus these fields. */
	settings?: Pick<
		AgentSkillModalData,
		'readOnly' | 'scopeOptions' | 'initialScope' | 'scopeLockedReason' | 'getDefaultName'
	>;
} & Pick<
	AgentSkillModalData,
	| 'hubSkillsEnabled'
	| 'getAttachedSkills'
	| 'projectLabel'
	| 'canCreateInstanceSkills'
	| 'onAttach'
	| 'onRemove'
	| 'outdated'
	| 'onUseLatestVersion'
	| 'getDefaultName'
> = {}) {
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
				...(settings ?? { projectId: 'p1', agentId: 'a1' }),
				skill,
				skillId,
				existingSkillNames,
				onConfirm,
				...hubOptions,
			},
		},
	});
}

const SAVED_SKILL: AgentSkill = {
	name: 'brand-voice',
	description: 'Write clear customer-facing copy.',
	instructions: 'Keep it short.',
};

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
		expect(getTitleInput(container)).toHaveValue('ghost');
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
		const { container, getByTestId, queryByTestId } = renderModal();

		expect(getByTestId('agent-skill-upload')).toBeInTheDocument();
		expect(queryByTestId('agent-skill-viewer')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
		expect(container.querySelector('h2')).toHaveTextContent('agents.builder.skills.add');
		expect(queryByTestId('agent-modal-title-input')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		expect(getTitleInput(container)).toHaveValue('New skill');
		expect(queryByTestId('agent-skill-name-input')).not.toBeInTheDocument();
		await fireEvent.update(getTitleInput(container), 'Draft skill');
		await fireEvent.click(getByTestId('agent-skill-add-reference'));
		await fireEvent.update(getByTestId('agent-skill-reference-editor'), 'Draft reference');
		await fireEvent.click(getByTestId('agent-modal-back'));

		expect(getByTestId('agent-skill-upload')).toBeInTheDocument();
		expect(queryByTestId('agent-modal-title-input')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		expect(getTitleInput(container)).toHaveValue('New skill');
		expect(
			queryByTestId('agent-skill-reference-nav-item-references-reference-md'),
		).not.toBeInTheDocument();
	});

	it('generates a unique title for a new manual skill', async () => {
		const { container, getByTestId } = renderModal({
			existingSkillNames: ['new skill', 'New skill 2'],
		});

		await fireEvent.click(getByTestId('agent-skill-add-manually'));

		expect(getTitleInput(container)).toHaveValue('New skill 3');
	});

	it('shows name errors beside the title after Save', async () => {
		const onConfirm = vi.fn();
		const { container, getByTestId, queryByTestId } = renderModal({
			onConfirm,
			skillId: 'skill-1',
			skill: { name: 'Research', description: 'Use for research', instructions: 'Research' },
			existingSkillNames: ['Other skill'],
		});

		await fireEvent.update(getTitleInput(container), ' other_SKILL ');
		expect(queryByTestId('agent-modal-title-error')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).not.toHaveBeenCalled();
		expect(getByTestId('agent-modal-title-error')).toHaveTextContent(
			'agents.builder.skills.validation.nameDuplicate',
		);
		expect(queryByTestId('agent-skill-name-input')).not.toBeInTheDocument();

		await fireEvent.update(getTitleInput(container), '   ');
		expect(getByTestId('agent-modal-title-error')).toHaveTextContent(
			'agents.builder.skills.validation.nameRequired',
		);

		await fireEvent.update(getTitleInput(container), 'Updated skill');
		await fireEvent.click(getByTestId('agent-skill-create-save'));
		expect(onConfirm).toHaveBeenCalledWith({
			id: 'skill-1',
			skill: {
				name: 'Updated skill',
				description: 'Use for research',
				instructions: 'Research',
			},
		});
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
		expect(getByTestId('agent-modal-title-input')).toHaveValue('Research');

		expect(trackImportedSkill).toHaveBeenCalledWith({
			agentId: 'a1',
			source: 'skill_file',
			status: 'success',
			referenceCount: 0,
		});
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
			method: 'upload',
		});
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('validates a manual skill and saves its edited reference', async () => {
		const onConfirm = vi.fn();
		const { getByTestId } = renderModal({ onConfirm });
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		await fireEvent.click(getByTestId('agent-skill-create-save'));
		expect(onConfirm).not.toHaveBeenCalled();

		await fireEvent.update(getByTestId('agent-modal-title-input'), ' Research ');
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
			method: 'manual',
		});
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('opens the empty reference on a blocked save, marks it, and names it on SKILL.md', async () => {
		const onConfirm = vi.fn();
		const { getByTestId, queryByTestId } = renderModal({ onConfirm });
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		await fireEvent.update(getByTestId('agent-modal-title-input'), 'Research');
		await fireEvent.update(
			getByTestId('agent-skill-description-input').querySelector('input')!,
			'Use for research',
		);
		await fireEvent.update(getByTestId('agent-skill-instructions-editor'), 'Read the guide');
		await fireEvent.click(getByTestId('agent-skill-add-reference'));
		await fireEvent.click(getByTestId('agent-skill-file-nav-item'));
		expect(queryByTestId('agent-skill-reference-editor')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('agent-skill-create-save'));

		// The save is blocked and the modal opens the file that blocks it.
		expect(onConfirm).not.toHaveBeenCalled();
		expect(getByTestId('agent-skill-reference-editor')).toBeInTheDocument();
		expect(
			getByTestId('agent-skill-reference-nav-item-references-reference-md-invalid'),
		).toBeInTheDocument();

		await fireEvent.click(getByTestId('agent-skill-file-nav-item'));
		// The notice names the empty file instead of the general summary.
		expect(getByTestId('agent-skill-references-error')).toHaveTextContent(
			'agents.builder.skills.references.emptyFile references/reference.md',
		);
		// Screen readers hear that the file blocks the save, not only its path.
		expect(
			getByTestId('agent-skill-reference-nav-item-references-reference-md'),
		).toHaveAccessibleName('agents.builder.skills.references.invalidLabel references/reference.md');
	});

	it('opens a reference that is too long on a blocked save, marks it, and names it', async () => {
		const onConfirm = vi.fn();
		const { getByTestId, getByText } = renderModal({ onConfirm });
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		await fireEvent.update(getByTestId('agent-modal-title-input'), 'Research');
		await fireEvent.update(
			getByTestId('agent-skill-description-input').querySelector('input')!,
			'Use for research',
		);
		await fireEvent.update(getByTestId('agent-skill-instructions-editor'), 'Read the guide');
		await fireEvent.click(getByTestId('agent-skill-add-reference'));
		await fireEvent.update(
			getByTestId('agent-skill-reference-editor'),
			'x'.repeat(AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH + 1),
		);
		await fireEvent.click(getByTestId('agent-skill-file-nav-item'));

		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).not.toHaveBeenCalled();
		expect(getByTestId('agent-skill-reference-editor')).toBeInTheDocument();
		expect(getByText(/agents\.builder\.skills\.references\.contentMaxLength/)).toBeInTheDocument();
		expect(
			getByTestId('agent-skill-reference-nav-item-references-reference-md-invalid'),
		).toBeInTheDocument();

		await fireEvent.click(getByTestId('agent-skill-file-nav-item'));
		expect(getByTestId('agent-skill-references-error')).toHaveTextContent(
			'agents.builder.skills.references.tooLongFile references/reference.md',
		);
	});

	it('opens SKILL.md on a blocked save when its fields are missing and a reference is open', async () => {
		const onConfirm = vi.fn();
		const { getByTestId, queryByTestId } = renderModal({ onConfirm });
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		await fireEvent.update(getByTestId('agent-modal-title-input'), 'Research');
		await fireEvent.click(getByTestId('agent-skill-add-reference'));
		await fireEvent.update(getByTestId('agent-skill-reference-editor'), '# Guide');

		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).not.toHaveBeenCalled();
		expect(queryByTestId('agent-skill-reference-editor')).not.toBeInTheDocument();
		expect(getByTestId('agent-skill-description-input')).toBeInTheDocument();
	});

	it('focuses the name when a new skill is started by hand', async () => {
		const { getByTestId } = renderModal();

		await fireEvent.click(getByTestId('agent-skill-add-manually'));

		await waitFor(() => expect(getByTestId('agent-modal-title-input')).toHaveFocus());
	});

	it('stays open with the edits and the name error when the save is refused', async () => {
		const onConfirm = vi.fn().mockResolvedValue({ saved: false, nameError: 'Name taken' });
		const { getByTestId, queryByTestId } = renderModal({
			onConfirm,
			skill: SAVED_SKILL,
			skillId: 's1',
		});
		await fireEvent.update(getByTestId('agent-modal-title-input'), 'Summarize');

		await fireEvent.click(getByTestId('agent-skill-create-save'));

		await waitFor(() =>
			expect(getByTestId('agent-modal-title-error')).toHaveTextContent('Name taken'),
		);
		expect(uiStore.closeModal).not.toHaveBeenCalled();
		expect(getByTestId('agent-modal-title-input')).toHaveValue('Summarize');
		expect(getByTestId('agent-modal-title-input')).toHaveFocus();

		await fireEvent.update(getByTestId('agent-modal-title-input'), 'Condense');
		expect(queryByTestId('agent-modal-title-error')).not.toBeInTheDocument();
	});

	it('locks the editor while the save is pending', async () => {
		let finish: (value?: undefined) => void = () => {};
		const onConfirm = vi.fn(
			async () => await new Promise<undefined>((resolve) => (finish = resolve)),
		);
		const { getByTestId, queryByTestId } = renderModal({
			onConfirm,
			skill: SAVED_SKILL,
			skillId: 's1',
		});
		await fireEvent.update(getByTestId('agent-modal-title-input'), 'Summarize');

		await fireEvent.click(getByTestId('agent-skill-create-save'));

		await waitFor(() => expect(getByTestId('agent-modal-title-input')).toBeDisabled());
		expect(queryByTestId('agent-skill-add-reference')).not.toBeInTheDocument();
		finish();
		await waitFor(() => expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME));
	});

	it('clears a refused name when the user goes back and starts again', async () => {
		const onConfirm = vi.fn().mockResolvedValue({ saved: false, nameError: 'Name taken' });
		const { getByTestId, queryByTestId } = renderModal({ onConfirm });
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		await fireEvent.update(
			getByTestId('agent-skill-description-input').querySelector('input')!,
			'Use for research',
		);
		await fireEvent.update(getByTestId('agent-skill-instructions-editor'), 'Read the guide');
		await fireEvent.click(getByTestId('agent-skill-create-save'));
		await waitFor(() => expect(getByTestId('agent-modal-title-error')).toBeInTheDocument());

		await fireEvent.click(getByTestId('agent-modal-back'));
		await fireEvent.click(getByTestId('agent-skill-add-manually'));

		expect(queryByTestId('agent-modal-title-error')).not.toBeInTheDocument();
	});

	it('stays open when the save fails, and closes once it succeeds', async () => {
		const onConfirm = vi
			.fn()
			.mockRejectedValueOnce(new Error('Network down'))
			.mockResolvedValueOnce(undefined);
		const { getByTestId } = renderModal({ onConfirm, skill: SAVED_SKILL, skillId: 's1' });
		await fireEvent.update(getByTestId('agent-modal-title-input'), 'Summarize');

		await fireEvent.click(getByTestId('agent-skill-create-save'));
		await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
		expect(uiStore.closeModal).not.toHaveBeenCalled();

		await fireEvent.click(getByTestId('agent-skill-create-save'));
		await waitFor(() => expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME));
	});

	it('creates a skill on the agent without the picker or the skills API when the skills hub is off', async () => {
		const onConfirm = vi.fn();
		const { container, getByTestId, queryByTestId } = renderModal({
			hubSkillsEnabled: false,
			onAttach: vi.fn(),
			onConfirm,
		});

		expect(queryByTestId('agent-skill-picker')).not.toBeInTheDocument();
		expect(getByTestId('agent-skill-upload')).toBeInTheDocument();
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		expect(queryByTestId('agent-skill-availability-select')).not.toBeInTheDocument();
		await fireEvent.update(getTitleInput(container), 'Research');
		await fireEvent.update(
			getByTestId('agent-skill-description-input').querySelector('input')!,
			'Use for research',
		);
		await fireEvent.update(getByTestId('agent-skill-instructions-editor'), 'Read the guide');
		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).toHaveBeenCalledWith(
			expect.not.objectContaining({ availableTo: expect.anything() }),
		);
		expect(listAttachableSkills).not.toHaveBeenCalled();
		expect(getHubSkill).not.toHaveBeenCalled();
	});

	describe('with the skills hub', () => {
		const projectSkill = makeListItem({ id: 'tone', name: 'Support tone', scope: 'project' });
		const instanceSkill = makeListItem({ id: 'sql', name: 'SQL helper', scope: 'instance' });
		const similarSkill = makeListItem({ id: 'voice', name: 'brand-voice', scope: 'instance' });
		const agentSkill = makeListItem({
			id: 'notes',
			name: 'Call notes',
			scope: 'project',
			agentId: 'a1',
		});

		it('lists attachable skills in project, agent and global tabs and attaches one without closing', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill, agentSkill, instanceSkill]);
			const onAttach = vi.fn().mockResolvedValue(undefined);
			const { findAllByTestId, getAllByTestId, getByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				projectLabel: 'Marketing',
				onAttach,
			});

			expect(listAttachableSkills).toHaveBeenCalledWith(expect.anything(), 'a1');
			expect(await findAllByTestId('agent-skill-picker-row')).toHaveLength(3);
			const picker = getByTestId('agent-skill-picker');
			expect(getAllByTestId('agent-skill-picker-category').map((node) => node.textContent)).toEqual(
				['project', 'this-agent', 'global'],
			);
			expect(queryByTestId('agent-skill-upload')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();

			await fireEvent.click(getAllByTestId('agent-skill-picker-toggle')[2]);

			expect(onAttach).toHaveBeenCalledWith(instanceSkill);
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(picker).toBeVisible();
		});

		it('names the project tab after the project of the agent', async () => {
			listAttachableSkills.mockResolvedValue([]);
			const { getByTestId } = renderModal({
				hubSkillsEnabled: true,
				projectLabel: 'Marketing',
				onAttach: vi.fn(),
			});

			expect(getByTestId('agent-skill-picker-tabs')).toHaveTextContent(
				'all,project,this-agent,global Marketing',
			);
		});

		it('shows a skill as attached while it attaches', async () => {
			listAttachableSkills.mockResolvedValue([instanceSkill]);
			let finishAttach = () => {};
			const onAttach = vi.fn(
				async () => await new Promise<void>((resolve) => (finishAttach = resolve)),
			);
			const { findByTestId } = renderModal({ hubSkillsEnabled: true, onAttach });

			const toggle = await findByTestId('agent-skill-picker-toggle');
			await fireEvent.click(toggle);

			expect(await findByTestId('agent-skill-picker-toggle')).toHaveAttribute(
				'data-attached',
				'true',
			);
			finishAttach();
			await waitFor(async () =>
				expect(await findByTestId('agent-skill-picker-toggle')).toHaveAttribute(
					'data-attached',
					'false',
				),
			);
		});

		it('detaches an attached skill without closing and refuses names that are hard to tell apart', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill, similarSkill]);
			const onAttach = vi.fn();
			const onRemove = vi.fn();
			const { findAllByTestId, getByTestId } = renderModal({
				hubSkillsEnabled: true,
				getAttachedSkills: () => [
					{ id: 'tone', name: 'Support tone' },
					{ id: 'other', name: 'Brand voice' },
				],
				onAttach,
				onRemove,
			});

			expect(await findAllByTestId('agent-skill-picker-row')).toHaveLength(2);
			expect(getByTestId('agent-skill-picker-disabled')).toHaveTextContent(
				'agents.builder.skills.picker.similarName',
			);
			const toggle = getByTestId('agent-skill-picker-toggle');
			expect(toggle).toHaveAttribute('data-attached', 'true');

			await fireEvent.click(toggle);

			expect(onRemove).toHaveBeenCalledWith('tone');
			expect(onAttach).not.toHaveBeenCalled();
			expect(uiStore.closeModal).not.toHaveBeenCalled();
		});

		it('shows an empty message when no skill can be attached', async () => {
			listAttachableSkills.mockResolvedValue([]);
			const { findByTestId } = renderModal({ hubSkillsEnabled: true, onAttach: vi.fn() });

			await waitFor(async () =>
				expect(await findByTestId('agent-skill-picker-empty')).toHaveTextContent(
					'agents.builder.skills.picker.empty',
				),
			);
		});

		it('links to the skills settings page from the picker, in a new tab', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill]);
			const open = vi.spyOn(window, 'open').mockReturnValue(null);
			const { getByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				onAttach: vi.fn(),
			});

			expect(getByTestId('agent-skill-picker-manage')).toHaveTextContent(
				'agents.builder.skills.picker.manage',
			);
			// The picker step has no Cancel and no Save.
			expect(queryByTestId('agent-modal-cancel')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();

			await fireEvent.click(getByTestId('agent-skill-picker-manage'));

			expect(resolveRoute).toHaveBeenCalledWith({ name: VIEWS.SETTINGS_CONTEXT_SKILLS });
			expect(open).toHaveBeenCalledWith('/settings/context/skills', '_blank', 'noopener');
			open.mockRestore();
		});

		it('shows the settings link only on the picker step', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill]);
			const { getByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				onAttach: vi.fn(),
			});

			await fireEvent.click(getByTestId('agent-skill-picker-create'));

			expect(queryByTestId('agent-skill-picker-manage')).not.toBeInTheDocument();
		});

		it('goes from the picker to the upload step and back', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill]);
			const { getByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				onAttach: vi.fn(),
			});

			await fireEvent.click(getByTestId('agent-skill-picker-create'));
			expect(getByTestId('agent-skill-upload')).toBeInTheDocument();

			await fireEvent.click(getByTestId('agent-modal-back'));
			expect(queryByTestId('agent-skill-upload')).not.toBeInTheDocument();
			expect(getByTestId('agent-skill-picker')).toBeVisible();
		});

		it('asks for a default name where "available to" puts the new skill', async () => {
			listAttachableSkills.mockResolvedValue([]);
			const getDefaultName = vi.fn().mockResolvedValue('New skill 3');
			const { getByTestId } = renderModal({
				hubSkillsEnabled: true,
				onAttach: vi.fn(),
				getDefaultName,
			});

			// "Create" from the "This agent" tab makes the skill available to this agent only.
			await fireEvent.click(getByTestId('agent-skill-picker-create-this-agent'));
			await fireEvent.click(getByTestId('agent-skill-add-manually'));

			expect(getDefaultName).toHaveBeenCalledWith('agent');
			await waitFor(() => expect(getTitleInput(document.body)).toHaveValue('New skill 3'));
		});

		it('opens a read-only preview from a row click and adds the skill from there', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill, instanceSkill]);
			getHubSkill.mockResolvedValue(
				makeDetail({ id: 'sql', name: 'SQL helper', scope: 'instance', canEdit: true }),
			);
			const onAttach = vi.fn();
			const { findAllByTestId, findByTestId, getByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				onAttach,
			});

			await fireEvent.click((await findAllByTestId('agent-skill-picker-row-open'))[1]);

			expect(await findByTestId('agent-skill-preview')).toBeInTheDocument();
			expect(getHubSkill).toHaveBeenCalledWith(expect.anything(), 'sql');
			expect(getByTestId('agent-skill-instructions-text')).toHaveTextContent('Instructions');
			expect(queryByTestId('agent-skill-instructions-editor')).not.toBeInTheDocument();
			expect(getByTestId('agent-skill-footer-hint')).toHaveTextContent(
				'agents.builder.skills.hint.addToEdit',
			);
			expect(queryByTestId('agent-modal-title-input')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-add-reference')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-remove')).not.toBeInTheDocument();
			expect(onAttach).not.toHaveBeenCalled();

			await fireEvent.click(getByTestId('agent-skill-preview-add'));

			expect(onAttach).toHaveBeenCalledWith(instanceSkill);
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(queryByTestId('agent-skill-preview')).not.toBeInTheDocument();
			expect(getByTestId('agent-skill-picker')).toBeVisible();
		});

		it('offers to remove an attached skill from its preview', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill]);
			getHubSkill.mockResolvedValue(
				makeDetail({ id: 'tone', name: 'Support tone', scope: 'project' }),
			);
			const onRemove = vi.fn();
			const { findByTestId, getByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				getAttachedSkills: () => [{ id: 'tone', name: 'Support tone' }],
				onAttach: vi.fn(),
				onRemove,
			});

			await fireEvent.click(await findByTestId('agent-skill-picker-row-open'));
			await findByTestId('agent-skill-preview');

			expect(queryByTestId('agent-skill-preview-add')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-footer-hint')).not.toBeInTheDocument();
			await fireEvent.click(getByTestId('agent-skill-remove'));

			expect(onRemove).toHaveBeenCalledWith('tone');
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(queryByTestId('agent-skill-preview')).not.toBeInTheDocument();
			expect(getByTestId('agent-skill-picker')).toBeVisible();
		});

		it('returns from the preview to the picker', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill]);
			getHubSkill.mockResolvedValue(
				makeDetail({ id: 'tone', name: 'Support tone', scope: 'project' }),
			);
			const { findByTestId, getByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				onAttach: vi.fn(),
			});

			await fireEvent.click(await findByTestId('agent-skill-picker-row-open'));
			await findByTestId('agent-skill-preview');
			await fireEvent.click(getByTestId('agent-modal-back'));

			expect(queryByTestId('agent-skill-preview')).not.toBeInTheDocument();
			expect(getByTestId('agent-skill-picker')).toBeVisible();
		});

		it('stays on the picker when the preview cannot load', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill]);
			getHubSkill.mockRejectedValue(new Error('Not found'));
			const { findByTestId, getByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				onAttach: vi.fn(),
			});

			await fireEvent.click(await findByTestId('agent-skill-picker-row-open'));

			await waitFor(() =>
				expect(showError).toHaveBeenCalledWith(
					expect.any(Error),
					'agents.builder.skills.picker.previewError',
				),
			);
			expect(queryByTestId('agent-skill-preview')).not.toBeInTheDocument();
			expect(getByTestId('agent-skill-picker')).toBeVisible();
		});

		it.each([
			// The project option names the project, which the modal hides behind it.
			['project', 'Marketing'],
			['instance', 'agents.builder.skills.availableTo.instance'],
		] as const)(
			'saves a new skill for the %s from the availability select',
			async (availableTo, label) => {
				listAttachableSkills.mockResolvedValue([]);
				const onConfirm = vi.fn();
				const { container, getByTestId, findByText } = renderModal({
					hubSkillsEnabled: true,
					canCreateInstanceSkills: true,
					projectLabel: 'Marketing',
					onAttach: vi.fn(),
					onConfirm,
				});

				await fireEvent.click(getByTestId('agent-skill-picker-create'));
				await fireEvent.click(getByTestId('agent-skill-add-manually'));
				await fireEvent.update(getTitleInput(container), 'Research');
				await fireEvent.update(
					getByTestId('agent-skill-description-input').querySelector('input')!,
					'Use for research',
				);
				await fireEvent.update(getByTestId('agent-skill-instructions-editor'), 'Read the guide');
				await fireEvent.click(
					getByTestId('agent-skill-availability-select').querySelector('.select-trigger')!,
				);
				await fireEvent.click(await findByText(label));
				await fireEvent.click(getByTestId('agent-skill-create-save'));

				expect(onConfirm).toHaveBeenCalledWith(
					expect.objectContaining({ id: undefined, availableTo }),
				);
			},
		);

		it('falls back to "This project" when the project name is unknown', async () => {
			listAttachableSkills.mockResolvedValue([]);
			const { getByTestId, findByText } = renderModal({
				hubSkillsEnabled: true,
				onAttach: vi.fn(),
			});

			await fireEvent.click(getByTestId('agent-skill-picker-create'));
			await fireEvent.click(getByTestId('agent-skill-add-manually'));
			await fireEvent.click(
				getByTestId('agent-skill-availability-select').querySelector('.select-trigger')!,
			);

			expect(await findByText('agents.builder.skills.availableTo.project')).toBeInTheDocument();
		});

		it.each([
			['all', true, 'agent'],
			['project', true, 'project'],
			['this-agent', true, 'agent'],
			['global', true, 'instance'],
			['global', false, 'agent'],
		] as const)(
			'starts a new skill from the %s tab with a matching target (global allowed: %s)',
			async (category, canCreateInstanceSkills, availableTo) => {
				listAttachableSkills.mockResolvedValue([]);
				const onConfirm = vi.fn();
				const { container, getByTestId } = renderModal({
					hubSkillsEnabled: true,
					canCreateInstanceSkills,
					onAttach: vi.fn(),
					onConfirm,
				});

				await fireEvent.click(getByTestId(`agent-skill-picker-create-${category}`));
				await fireEvent.click(getByTestId('agent-skill-add-manually'));
				await fireEvent.update(getTitleInput(container), 'Research');
				await fireEvent.update(
					getByTestId('agent-skill-description-input').querySelector('input')!,
					'Use for research',
				);
				await fireEvent.update(getByTestId('agent-skill-instructions-editor'), 'Read the guide');
				await fireEvent.click(getByTestId('agent-skill-create-save'));

				expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ availableTo }));
			},
		);

		it('checks a new skill name against the skills attached after the picker opened', async () => {
			listAttachableSkills.mockResolvedValue([]);
			const attached = ref<Array<{ id: string; name: string }>>([]);
			const onConfirm = vi.fn();
			const { container, getByTestId } = renderModal({
				hubSkillsEnabled: true,
				onAttach: vi.fn(),
				getAttachedSkills: () => attached.value,
				onConfirm,
			});

			attached.value = [{ id: 'brand', name: 'P-Brand voice' }];
			await fireEvent.click(getByTestId('agent-skill-picker-create'));
			await fireEvent.click(getByTestId('agent-skill-add-manually'));
			await fireEvent.update(getTitleInput(container), 'p brand voice');
			await fireEvent.update(
				getByTestId('agent-skill-description-input').querySelector('input')!,
				'Use for replies',
			);
			await fireEvent.update(getByTestId('agent-skill-instructions-editor'), 'Be kind');
			await fireEvent.click(getByTestId('agent-skill-create-save'));

			expect(onConfirm).not.toHaveBeenCalled();
			expect(getByTestId('agent-modal-title-error')).toHaveTextContent(
				'agents.builder.skills.validation.nameDuplicate',
			);
		});

		it('offers only this project and this agent to a user who may not create global skills', async () => {
			listAttachableSkills.mockResolvedValue([]);
			const { getByTestId, findByText, queryByText } = renderModal({
				hubSkillsEnabled: true,
				onAttach: vi.fn(),
			});

			await fireEvent.click(getByTestId('agent-skill-picker-create'));
			await fireEvent.click(getByTestId('agent-skill-add-manually'));
			await fireEvent.click(
				getByTestId('agent-skill-availability-select').querySelector('.select-trigger')!,
			);

			expect(await findByText('agents.builder.skills.availableTo.agent')).toBeInTheDocument();
			expect(queryByText('agents.builder.skills.availableTo.instance')).not.toBeInTheDocument();
		});

		it('keeps a skill read-only and reports the error when its access check fails', async () => {
			const error = new Error('offline');
			getHubSkill.mockRejectedValue(error);
			const { findByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				skillId: 'sql',
				skill: { name: 'SQL helper', description: 'Use for SQL', instructions: 'Write SQL' },
				onRemove: vi.fn(),
			});

			await findByTestId('agent-skill-remove');
			await vi.waitFor(() =>
				expect(showError).toHaveBeenCalledWith(error, 'agents.builder.skills.accessError'),
			);
			expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
		});

		it('shows a skill that the user cannot edit as read-only', async () => {
			getHubSkill.mockResolvedValue(
				makeDetail({ id: 'sql', name: 'SQL helper', scope: 'instance', canEdit: false }),
			);
			const onRemove = vi.fn();
			const { findByTestId, getByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				skillId: 'sql',
				skill: { name: 'SQL helper', description: 'Use for SQL', instructions: 'Write SQL' },
				onRemove,
			});

			expect(await findByTestId('agent-skill-footer-hint')).toHaveTextContent(
				'agents.builder.skills.hint.readOnly.instance',
			);
			expect(getByTestId('agent-skill-description-text')).toHaveTextContent('Use for SQL');
			expect(queryByTestId('agent-skill-description-input')).not.toBeInTheDocument();
			expect(getHubSkill).toHaveBeenCalledWith(expect.anything(), 'sql');
			expect(queryByTestId('agent-modal-title-input')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-add-reference')).not.toBeInTheDocument();

			await fireEvent.click(getByTestId('agent-skill-remove'));
			expect(onRemove).toHaveBeenCalledWith('sql');
		});

		describe('where an existing skill can be added', () => {
			const tone = {
				name: 'Support tone',
				description: 'Use for replies',
				instructions: 'Be kind',
			};

			async function renderEdit(detail: SkillDetail, onConfirm = vi.fn()) {
				getHubSkill.mockResolvedValue(detail);
				const result = renderModal({
					hubSkillsEnabled: true,
					skillId: detail.id,
					skill: tone,
					onConfirm,
					onRemove: vi.fn(),
				});
				await result.findByTestId('agent-skill-availability-select');
				return result;
			}

			it('enables save only after the skill or its target changes', async () => {
				const { getByTestId } = await renderEdit(
					makeDetail({ id: 'tone', name: 'Support tone', scope: 'project' }),
				);

				expect(getByTestId('agent-skill-create-save')).toBeDisabled();

				await fireEvent.update(
					getByTestId('agent-skill-description-input').querySelector('input')!,
					'Use for all replies',
				);

				expect(getByTestId('agent-skill-create-save')).toBeEnabled();
			});

			it('changes the target of a skill that no other agent uses', async () => {
				const onConfirm = vi.fn();
				const { getByTestId, findByText } = await renderEdit(
					{
						...makeDetail({ id: 'tone', name: 'Support tone', scope: 'project' }),
						usedBy: {
							drafts: [{ agentId: 'a1', agentName: 'This agent', projectId: 'p1' }],
							pins: [{ agentId: 'a1', agentName: 'This agent', projectId: 'p1', version: 1 }],
							hiddenAgents: 0,
						},
					},
					onConfirm,
				);

				const select = getByTestId('agent-skill-availability-select');
				await fireEvent.click(select.querySelector('.select-trigger')!);
				await fireEvent.click(await findByText('agents.builder.skills.availableTo.agent'));
				await fireEvent.click(getByTestId('agent-skill-create-save'));

				expect(onConfirm).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'tone', availableTo: 'agent' }),
				);
			});

			it('does not send a target when the user keeps it', async () => {
				const onConfirm = vi.fn();
				const { getByTestId } = await renderEdit(
					makeDetail({ id: 'tone', name: 'Support tone', scope: 'project', agentId: 'a1' }),
					onConfirm,
				);

				await fireEvent.click(getByTestId('agent-skill-create-save'));

				expect(onConfirm).toHaveBeenCalledWith(
					expect.not.objectContaining({ availableTo: expect.anything() }),
				);
			});

			it.each([
				[
					'a draft of another agent',
					{
						drafts: [{ agentId: 'a2', agentName: 'Other', projectId: 'p1' }],
						pins: [],
						hiddenAgents: 0,
					},
				],
				[
					'a pin of another agent',
					{
						drafts: [],
						pins: [{ agentId: 'a2', agentName: 'Other', projectId: 'p1', version: null }],
						hiddenAgents: 0,
					},
				],
				['an agent the user cannot see', { drafts: [], pins: [], hiddenAgents: 1 }],
			])('locks the target when %s uses the skill', async (_case, usedBy) => {
				const { getByTestId } = await renderEdit({
					...makeDetail({ id: 'tone', name: 'Support tone', scope: 'project' }),
					usedBy,
				});

				expect(
					getByTestId('agent-skill-availability-select').querySelector('.is-disabled, [disabled]'),
				).not.toBeNull();
			});
		});

		it('shows a skill on an older version as read-only with a switch to the latest version', async () => {
			getHubSkill.mockResolvedValue(
				makeDetail({ id: 'tone', name: 'Support tone', scope: 'project', canEdit: true }),
			);
			const onUseLatestVersion = vi.fn();
			const { findByTestId, getByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				skillId: 'tone',
				skill: { name: 'Support tone', description: 'Use for replies', instructions: 'Be kind' },
				outdated: true,
				onUseLatestVersion,
				onRemove: vi.fn(),
			});

			expect(await findByTestId('agent-skill-footer-hint')).toHaveTextContent(
				'agents.builder.skills.hint.outdated',
			);
			expect(getByTestId('agent-skill-description-text')).toHaveTextContent('Use for replies');
			expect(queryByTestId('agent-modal-title-input')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
			expect(getByTestId('agent-skill-remove')).toBeInTheDocument();

			await fireEvent.click(getByTestId('agent-skill-use-latest'));

			expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
			expect(onUseLatestVersion).toHaveBeenCalledWith('tone');
		});

		it('keeps a skill that the user can edit editable', async () => {
			getHubSkill.mockResolvedValue(
				makeDetail({ id: 'tone', name: 'Support tone', scope: 'project', canEdit: true }),
			);
			const { findByTestId, queryByTestId } = renderModal({
				hubSkillsEnabled: true,
				skillId: 'tone',
				skill: { name: 'Support tone', description: 'Use for replies', instructions: 'Be kind' },
			});

			await waitFor(() => expect(getHubSkill).toHaveBeenCalled());
			expect(await findByTestId('agent-modal-title-input')).toBeInTheDocument();
			expect(queryByTestId('agent-skill-footer-hint')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-description-input')).toBeInTheDocument();
			expect(queryByTestId('agent-skill-create-save')).toBeInTheDocument();
		});
	});
});

describe('AgentSkillModal from Settings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		const uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
	});

	it('shows a read-only skill without edit controls', () => {
		const { getByTestId, queryByTestId } = renderModal({
			skillId: 's1',
			skill: SAVED_SKILL,
			settings: { readOnly: true },
		});

		expect(getByTestId('agent-skill-read-only-callout')).toHaveTextContent(
			'settings.context.skills.readOnly',
		);
		expect(queryByTestId('agent-modal-title-input')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-add-reference')).not.toBeInTheDocument();
	});

	it('returns the chosen scope with a new skill', async () => {
		const onConfirm = vi.fn();
		const { getByTestId } = renderModal({
			onConfirm,
			settings: {
				scopeOptions: [
					{ value: 'project:personal-1', label: 'Personal project', icon: 'user' },
					{ value: 'project:team-1', label: 'Marketing', icon: 'layers' },
				],
				initialScope: 'project:team-1',
			},
		});
		await fireEvent.change(getByTestId('agent-skill-skill-md-file-input'), {
			target: {
				files: [new File(['---\nname: Research\ndescription: Use it\n---\nBody'], 'SKILL.md')],
			},
		});
		await waitFor(() => expect(getByTestId('agent-skill-viewer')).toBeInTheDocument());

		// Pick the option that is not the initial one, so the test fails if the choice is lost.
		await userEvent.click(getByTestId('agent-skill-scope-select'));
		const option = await waitFor(() => {
			const match = [...document.querySelectorAll('.el-select-dropdown__item')].find((item) =>
				item.textContent?.includes('Personal project'),
			);
			if (!match) throw new Error('Expected the Personal project option');
			return match;
		});
		await userEvent.click(option);
		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).toHaveBeenCalledWith({
			id: undefined,
			skill: { name: 'Research', description: 'Use it', instructions: 'Body' },
			scope: 'project:personal-1',
			method: 'upload',
		});
		// Settings has no agent, so the builder's import event is not sent.
		expect(trackImportedSkill).not.toHaveBeenCalled();
	});

	it('shows the scope of a saved skill without letting the user change it', () => {
		const { getByTestId } = renderModal({
			skillId: 's1',
			skill: SAVED_SKILL,
			settings: {
				scopeOptions: [{ value: 'agent', label: 'FirstClassDarwin only', icon: 'bot' }],
				initialScope: 'agent',
				scopeLockedReason: 'You cannot change it.',
			},
		});

		expect(getByTestId('agent-skill-scope')).toBeInTheDocument();
		expect(getByTestId('agent-skill-scope-select').querySelector('input')).toBeDisabled();
	});

	it('asks the server for a free default name when a skill is started by hand', async () => {
		const getDefaultName = vi.fn().mockResolvedValue('New skill 3');
		const { getByTestId } = renderModal({
			settings: {
				scopeOptions: [{ value: 'instance', label: 'Global', icon: 'globe' }],
				initialScope: 'instance',
				getDefaultName,
			},
		});

		await fireEvent.click(getByTestId('agent-skill-add-manually'));

		expect(getDefaultName).toHaveBeenCalledWith('instance');
		await waitFor(() => expect(getTitleInput(document.body)).toHaveValue('New skill 3'));
	});

	it('blocks Save until the default name lookup answers', async () => {
		let answer: (name: string) => void = () => {};
		const { getByTestId } = renderModal({
			settings: {
				scopeOptions: [{ value: 'instance', label: 'Global', icon: 'globe' }],
				getDefaultName: vi.fn(
					async () => await new Promise<string>((resolve) => (answer = resolve)),
				),
			},
		});

		await fireEvent.click(getByTestId('agent-skill-add-manually'));

		expect(getByTestId('agent-skill-create-save')).toBeDisabled();
		answer('New skill 2');
		await waitFor(() => expect(getByTestId('agent-skill-create-save')).not.toBeDisabled());
	});

	it('ignores an answer that a newer lookup replaced', async () => {
		const answers: Array<(name: string) => void> = [];
		const { getByTestId } = renderModal({
			settings: {
				scopeOptions: [{ value: 'instance', label: 'Global', icon: 'globe' }],
				getDefaultName: vi.fn(
					async () => await new Promise<string>((resolve) => answers.push(resolve)),
				),
			},
		});

		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		await fireEvent.click(getByTestId('agent-modal-back'));
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		answers[1]('New skill 3');
		await waitFor(() => expect(getTitleInput(document.body)).toHaveValue('New skill 3'));
		answers[0]('New skill 2');
		await new Promise(process.nextTick);

		expect(getTitleInput(document.body)).toHaveValue('New skill 3');
	});

	it('keeps the local default name when the server does not answer', async () => {
		const { getByTestId } = renderModal({
			settings: {
				scopeOptions: [{ value: 'instance', label: 'Global', icon: 'globe' }],
				getDefaultName: vi.fn().mockRejectedValue(new Error('offline')),
			},
		});

		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		await new Promise(process.nextTick);

		expect(getTitleInput(document.body)).toHaveValue('New skill');
	});

	it('does not ask for a default name when an existing skill is edited', () => {
		const getDefaultName = vi.fn();
		renderModal({ skillId: 's1', skill: SAVED_SKILL, settings: { getDefaultName } });

		expect(getDefaultName).not.toHaveBeenCalled();
	});

	it('keeps the scope field out of the agent builder', () => {
		const { queryByTestId } = renderModal({ skillId: 's1', skill: SAVED_SKILL });

		expect(queryByTestId('agent-skill-scope')).not.toBeInTheDocument();
	});
});

function makeListItem(
	overrides: Pick<SkillListItem, 'id' | 'name' | 'scope'> & Partial<SkillListItem>,
): SkillListItem {
	return {
		description: `${overrides.name} description`,
		projectId: overrides.scope === 'project' ? 'p1' : null,
		projectName: overrides.scope === 'project' ? 'Marketing' : null,
		projectType: overrides.scope === 'project' ? 'team' : null,
		agentId: null,
		agentName: null,
		source: 'ui',
		createdBy: null,
		latestVersion: 1,
		usedByAgents: 0,
		canEdit: true,
		canDelete: true,
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
		...overrides,
	};
}

function makeDetail(
	overrides: Pick<SkillListItem, 'id' | 'name' | 'scope'> & Partial<SkillListItem>,
): SkillDetail {
	const item = makeListItem(overrides);
	return {
		...item,
		skill: { name: item.name, description: item.description, instructions: 'Instructions' },
		skillHash: 'hash',
		usedBy: { drafts: [], pins: [], hiddenAgents: 0 },
	};
}

function getTitleInput(container: Element): HTMLInputElement {
	const input = container.querySelector<HTMLInputElement>(
		'[data-testid="agent-modal-title-input"]',
	);
	if (!input) throw new Error('Expected an editable skill title');
	return input;
}

function makeReferences(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		path: index === 0 ? 'references/reference.md' : `references/reference-${index + 1}.md`,
		content: 'Reference',
	}));
}
