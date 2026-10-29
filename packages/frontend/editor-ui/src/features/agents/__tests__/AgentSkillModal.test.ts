import { AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH } from '@n8n/api-types';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, ref, type PropType } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { configure, fireEvent, screen, waitFor, within } from '@testing-library/vue';
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
const { listAttachableSkills, getSkillDetail, listSkillVersions, getSkillVersion } = vi.hoisted(
	() => ({
		listAttachableSkills: vi.fn(),
		getSkillDetail: vi.fn(),
		listSkillVersions: vi.fn(),
		getSkillVersion: vi.fn(),
	}),
);
vi.mock('../composables/useAgentApi', () => ({
	createAgentSkill: (...args: unknown[]) => apiCreateSpy(...args),
	listAttachableSkills,
	getSkillDetail,
	listSkillVersions,
	getSkillVersion,
}));

const { showMessage, showError, trackImportedSkill } = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showError: vi.fn(),
	trackImportedSkill: vi.fn(),
}));
const { confirmSpy } = vi.hoisted(() => ({ confirmSpy: vi.fn() }));
vi.mock('@/app/composables/useMessage', () => ({ useMessage: () => ({ confirm: confirmSpy }) }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('@/features/shared/toolsConnection/ToolsConnectionModal.vue', () => ({
	default: {
		name: 'ToolsConnectionModal',
		props: {
			items: Array,
			emptyMessage: String,
			createAction: Object,
			categories: Array,
			categoryLabels: Object,
			hideEmptyCategories: Boolean,
			connectLabel: Function,
			connectAriaLabel: Function,
		},
		emits: ['connect', 'open-detail', 'create'],
		template: `
			<div data-testid="agent-skill-picker">
				<span data-testid="agent-skill-picker-tabs" :data-hide-empty="String(hideEmptyCategories)">{{ categories.join(',') }} {{ categoryLabels?.project }}</span>
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
					<span v-else-if="item.attached" data-testid="agent-skill-picker-added" />
					<button v-else data-testid="agent-skill-picker-add" :aria-label="connectAriaLabel?.(item)" @click="$emit('connect', item)">{{ connectLabel?.(item) }}</button>
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

type StubItem = {
	id: string;
	label: string;
	testId?: string;
	disabled?: boolean;
	checked?: boolean;
	children?: StubItem[];
};

/** Renders every item, submenu items included, as a button that selects it. */
const ActionDropdownStub = defineComponent({
	props: { items: { type: Array as PropType<StubItem[]>, default: () => [] } },
	emits: ['select'],
	computed: {
		flatItems(): StubItem[] {
			return this.items.flatMap((item) => [item, ...(item.children ?? [])]);
		},
	},
	template: `
		<div v-bind="$attrs">
			<slot name="activator" />
			<button
				v-for="item in flatItems"
				:key="item.id"
				:data-testid="item.testId"
				:data-checked="item.checked ? 'true' : undefined"
				:disabled="item.disabled"
				@click="$emit('select', item.id)"
			><slot name="menuItem" v-bind="item">{{ item.label }}</slot></button>
		</div>
	`,
});

function renderModal({
	onConfirm = vi.fn(),
	skill,
	skillId,
	existingSkillNames,
	settings,
	...skillRefOptions
}: {
	onConfirm?: AgentSkillModalData['onConfirm'];
	skill?: AgentSkill;
	skillId?: string;
	existingSkillNames?: string[];
	/** Opens the modal as Settings > Context > Skills does: no agent, plus these fields. */
	settings?: Pick<
		AgentSkillModalData,
		| 'readOnly'
		| 'syncedFrom'
		| 'onStopSyncing'
		| 'scopeOptions'
		| 'initialScope'
		| 'scopeLockedReason'
		| 'getDefaultName'
		| 'availableToAssistant'
		| 'usedBy'
		| 'availableToMCP'
		| 'onDelete'
		| 'deleteDisabledReason'
		| 'initialVersionsOpen'
		| 'initialCompare'
		| 'latestVersion'
	>;
} & Pick<
	AgentSkillModalData,
	| 'skillRefsEnabled'
	| 'getAttachedSkills'
	| 'projectLabel'
	| 'canCreateInstanceSkills'
	| 'onAttach'
	| 'onRemove'
	| 'outdated'
	| 'onUseLatestVersion'
	| 'getDefaultName'
	| 'agentName'
	| 'latestVersion'
	| 'agentVersions'
	| 'onUseVersion'
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
					template:
						'<button v-bind="$attrs" :disabled="disabled"><slot name="icon" /><slot /></button>',
					props: ['variant', 'disabled'],
				},
				N8nCallout: {
					template: '<div v-bind="$attrs"><slot /><slot name="trailingContent" /></div>',
				},
				N8nActionDropdown: ActionDropdownStub,
				ActionDropdown: ActionDropdownStub,
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
				...skillRefOptions,
			},
		},
	});
}

// Every suite renders an open modal with fresh stores.
beforeEach(() => {
	vi.clearAllMocks();
	createTestingPinia({ stubActions: false });
	const uiStore = mockedStore(useUIStore);
	uiStore.openModal(MODAL_NAME);
	uiStore.closeModal = vi.fn();
});

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
		expect(container.querySelector('[data-testid="agent-skill-modal"]')).not.toHaveAttribute(
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
		expect(queryByTestId('agent-skill-name-input')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		expect(getTitleInput(container)).toHaveValue('New skill');
		await fireEvent.update(getTitleInput(container), 'Draft skill');
		await fireEvent.click(getByTestId('agent-skill-add-reference'));
		await fireEvent.update(getByTestId('agent-skill-reference-editor'), 'Draft reference');
		await fireEvent.click(getByTestId('agent-modal-back'));

		expect(getByTestId('agent-skill-upload')).toBeInTheDocument();
		expect(queryByTestId('agent-skill-name-input')).not.toBeInTheDocument();
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

	it('shows name errors under the name field after Save', async () => {
		const onConfirm = vi.fn();
		const { container, getByTestId, queryByTestId } = renderModal({
			onConfirm,
			skillId: 'skill-1',
			skill: { name: 'Research', description: 'Use for research', instructions: 'Research' },
			existingSkillNames: ['Other skill'],
		});

		await fireEvent.update(getTitleInput(container), ' other_SKILL ');
		expect(queryByTestId('agent-skill-name-error')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).not.toHaveBeenCalled();
		expect(getByTestId('agent-skill-name-error')).toHaveTextContent(
			'agents.builder.skills.validation.nameDuplicate',
		);

		await fireEvent.update(getTitleInput(container), '   ');
		expect(getByTestId('agent-skill-name-error')).toHaveTextContent(
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

	// The Agent Skills format allows descriptions of up to 1024 characters.
	it.each([
		{ length: 1024, saved: true },
		{ length: 1025, saved: false },
	])('saves a description of $length characters → $saved', async ({ length, saved }) => {
		const onConfirm = vi.fn();
		const { getByTestId } = renderModal({
			onConfirm,
			skillId: 'skill-1',
			skill: { name: 'Research', description: 'Use for research', instructions: 'Research' },
		});

		await fireEvent.update(
			getByTestId('agent-skill-description-input').querySelector('input')!,
			'x'.repeat(length),
		);
		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).toHaveBeenCalledTimes(saved ? 1 : 0);
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
		expect(getByTestId('agent-skill-name-input').querySelector('input')!).toHaveValue('Research');

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
			method: 'manual',
		});
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('opens the empty reference on a blocked save, marks it, and names it on SKILL.md', async () => {
		const onConfirm = vi.fn();
		const { getByTestId, queryByTestId } = renderModal({ onConfirm });
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		await fireEvent.update(
			getByTestId('agent-skill-name-input').querySelector('input')!,
			'Research',
		);
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
		await fireEvent.update(
			getByTestId('agent-skill-name-input').querySelector('input')!,
			'Research',
		);
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
		await fireEvent.update(
			getByTestId('agent-skill-name-input').querySelector('input')!,
			'Research',
		);
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

		await waitFor(() =>
			expect(getByTestId('agent-skill-name-input').querySelector('input')!).toHaveFocus(),
		);
	});

	it('offers to remove an inline skill of an agent without skill refs', async () => {
		const onRemove = vi.fn();
		const { getByTestId } = renderModal({
			skill: SAVED_SKILL,
			skillId: 's1',
			skillRefsEnabled: false,
			onRemove,
		});

		expect(getByTestId('agent-skill-remove')).toHaveTextContent('agents.builder.skills.remove');
		await fireEvent.click(getByTestId('agent-skill-remove'));

		expect(onRemove).toHaveBeenCalledWith('s1');
	});

	it('stays open with the edits and the name error when the save is refused', async () => {
		const onConfirm = vi.fn().mockResolvedValue({ saved: false, nameError: 'Name taken' });
		const { getByTestId, queryByTestId } = renderModal({
			onConfirm,
			skill: SAVED_SKILL,
			skillId: 's1',
		});
		await fireEvent.update(
			getByTestId('agent-skill-name-input').querySelector('input')!,
			'Summarize',
		);

		await fireEvent.click(getByTestId('agent-skill-create-save'));

		await waitFor(() =>
			expect(getByTestId('agent-skill-name-error')).toHaveTextContent('Name taken'),
		);
		expect(uiStore.closeModal).not.toHaveBeenCalled();
		expect(getByTestId('agent-skill-name-input').querySelector('input')!).toHaveValue('Summarize');
		expect(getByTestId('agent-skill-name-input').querySelector('input')!).toHaveFocus();

		await fireEvent.update(
			getByTestId('agent-skill-name-input').querySelector('input')!,
			'Condense',
		);
		expect(queryByTestId('agent-skill-name-error')).not.toBeInTheDocument();
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
		await fireEvent.update(
			getByTestId('agent-skill-name-input').querySelector('input')!,
			'Summarize',
		);

		await fireEvent.click(getByTestId('agent-skill-create-save'));

		await waitFor(() =>
			expect(getByTestId('agent-skill-name-input').querySelector('input')!).toBeDisabled(),
		);
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
		await waitFor(() => expect(getByTestId('agent-skill-name-error')).toBeInTheDocument());

		await fireEvent.click(getByTestId('agent-modal-back'));
		await fireEvent.click(getByTestId('agent-skill-add-manually'));

		expect(queryByTestId('agent-skill-name-error')).not.toBeInTheDocument();
	});

	it('stays open when the save fails, and closes once it succeeds', async () => {
		const onConfirm = vi
			.fn()
			.mockRejectedValueOnce(new Error('Network down'))
			.mockResolvedValueOnce(undefined);
		const { getByTestId } = renderModal({ onConfirm, skill: SAVED_SKILL, skillId: 's1' });
		await fireEvent.update(
			getByTestId('agent-skill-name-input').querySelector('input')!,
			'Summarize',
		);

		await fireEvent.click(getByTestId('agent-skill-create-save'));
		await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
		expect(uiStore.closeModal).not.toHaveBeenCalled();

		await fireEvent.click(getByTestId('agent-skill-create-save'));
		await waitFor(() => expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME));
	});

	it('creates a skill on the agent without the picker or the skills API for an inline agent', async () => {
		const onConfirm = vi.fn();
		const { container, getByTestId, queryByTestId } = renderModal({
			skillRefsEnabled: false,
			onAttach: vi.fn(),
			onConfirm,
		});

		expect(queryByTestId('agent-skill-picker')).not.toBeInTheDocument();
		expect(getByTestId('agent-skill-upload')).toBeInTheDocument();
		await fireEvent.click(getByTestId('agent-skill-add-manually'));
		expect(queryByTestId('agent-skill-scope-badge')).not.toBeInTheDocument();
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
		expect(getSkillDetail).not.toHaveBeenCalled();
	});

	describe('with the skills module', () => {
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
				skillRefsEnabled: true,
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

			await fireEvent.click(getAllByTestId('agent-skill-picker-add')[2]);

			expect(onAttach).toHaveBeenCalledWith(instanceSkill);
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(picker).toBeVisible();
		});

		it('labels the add action and hides empty tabs', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill, instanceSkill]);
			const { findAllByTestId, getByTestId } = renderModal({
				skillRefsEnabled: true,
				onAttach: vi.fn(),
				getAttachedSkills: () => [{ id: instanceSkill.id, name: instanceSkill.name }],
			});

			const [toAdd] = await findAllByTestId('agent-skill-picker-add');
			expect(toAdd).toHaveTextContent('agents.builder.skills.picker.add');
			expect(toAdd).toHaveAttribute(
				'aria-label',
				'agents.builder.skills.picker.addAriaLabel Support tone',
			);
			expect(getByTestId('agent-skill-picker-tabs')).toHaveAttribute('data-hide-empty', 'true');
		});

		it('names the project tab after the project of the agent', async () => {
			listAttachableSkills.mockResolvedValue([]);
			const { getByTestId } = renderModal({
				skillRefsEnabled: true,
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
			const { findByTestId } = renderModal({ skillRefsEnabled: true, onAttach });

			await fireEvent.click(await findByTestId('agent-skill-picker-add'));

			expect(await findByTestId('agent-skill-picker-added')).toBeInTheDocument();
			finishAttach();
			expect(await findByTestId('agent-skill-picker-add')).toBeInTheDocument();
		});

		it('shows an attached skill as added and refuses names that are hard to tell apart', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill, similarSkill]);
			const { findAllByTestId, getByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
				getAttachedSkills: () => [
					{ id: 'tone', name: 'Support tone' },
					{ id: 'other', name: 'Brand voice' },
				],
				onAttach: vi.fn(),
			});

			expect(await findAllByTestId('agent-skill-picker-row')).toHaveLength(2);
			expect(getByTestId('agent-skill-picker-disabled')).toHaveTextContent(
				'agents.builder.skills.picker.similarName',
			);
			expect(getByTestId('agent-skill-picker-added')).toBeInTheDocument();
			expect(queryByTestId('agent-skill-picker-add')).not.toBeInTheDocument();
		});

		it('shows an empty message when no skill can be attached', async () => {
			listAttachableSkills.mockResolvedValue([]);
			const { findByTestId } = renderModal({ skillRefsEnabled: true, onAttach: vi.fn() });

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
				skillRefsEnabled: true,
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
				skillRefsEnabled: true,
				onAttach: vi.fn(),
			});

			await fireEvent.click(getByTestId('agent-skill-picker-create'));

			expect(queryByTestId('agent-skill-picker-manage')).not.toBeInTheDocument();
		});

		it('goes from the picker to the upload step and back', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill]);
			const { getByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
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
				skillRefsEnabled: true,
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
			getSkillDetail.mockResolvedValue(
				makeDetail({ id: 'sql', name: 'SQL helper', scope: 'instance', canEdit: true }),
			);
			const onAttach = vi.fn();
			const { findAllByTestId, findByTestId, getByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
				onAttach,
			});

			await fireEvent.click((await findAllByTestId('agent-skill-picker-row-open'))[1]);

			expect(await findByTestId('agent-skill-preview')).toBeInTheDocument();
			expect(getSkillDetail).toHaveBeenCalledWith(expect.anything(), 'sql');
			expect(getByTestId('agent-skill-instructions-text')).toHaveTextContent('Instructions');
			expect(queryByTestId('agent-skill-instructions-editor')).not.toBeInTheDocument();
			expect(getByTestId('agent-skill-footer-hint')).toHaveTextContent(
				'agents.builder.skills.hint.addToEdit',
			);
			expect(queryByTestId('agent-skill-name-input')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-add-reference')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-menu-attach')).not.toBeInTheDocument();
			expect(onAttach).not.toHaveBeenCalled();

			await fireEvent.click(getByTestId('agent-skill-preview-add'));

			expect(onAttach).toHaveBeenCalledWith(instanceSkill);
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(queryByTestId('agent-skill-preview')).not.toBeInTheDocument();
			expect(getByTestId('agent-skill-picker')).toBeVisible();
		});

		it('offers to remove an attached skill from its preview', async () => {
			listAttachableSkills.mockResolvedValue([projectSkill]);
			getSkillDetail.mockResolvedValue(
				makeDetail({ id: 'tone', name: 'Support tone', scope: 'project' }),
			);
			const onRemove = vi.fn();
			const { findByTestId, getByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
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
			getSkillDetail.mockResolvedValue(
				makeDetail({ id: 'tone', name: 'Support tone', scope: 'project' }),
			);
			const { findByTestId, getByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
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
			getSkillDetail.mockRejectedValue(new Error('Not found'));
			const { findByTestId, getByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
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
				const { container, getByTestId } = renderModal({
					skillRefsEnabled: true,
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
				expect(getByTestId(`agent-skill-scope-option-${availableTo}`)).toHaveTextContent(label);
				await fireEvent.click(getByTestId(`agent-skill-scope-option-${availableTo}`));
				await fireEvent.click(getByTestId('agent-skill-create-save'));

				expect(onConfirm).toHaveBeenCalledWith(
					expect.objectContaining({ id: undefined, availableTo }),
				);
			},
		);

		it('falls back to "This project" when the project name is unknown', async () => {
			listAttachableSkills.mockResolvedValue([]);
			const { getByTestId, findByTestId } = renderModal({
				skillRefsEnabled: true,
				onAttach: vi.fn(),
			});

			await fireEvent.click(getByTestId('agent-skill-picker-create'));
			await fireEvent.click(getByTestId('agent-skill-add-manually'));

			expect(await findByTestId('agent-skill-scope-option-project')).toHaveTextContent(
				'agents.builder.skills.availableTo.project',
			);
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
					skillRefsEnabled: true,
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
				skillRefsEnabled: true,
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
			expect(getByTestId('agent-skill-name-error')).toHaveTextContent(
				'agents.builder.skills.validation.nameDuplicate',
			);
		});

		it('offers only this project and this agent to a user who may not create global skills', async () => {
			listAttachableSkills.mockResolvedValue([]);
			const { getByTestId, findByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
				onAttach: vi.fn(),
			});

			await fireEvent.click(getByTestId('agent-skill-picker-create'));
			await fireEvent.click(getByTestId('agent-skill-add-manually'));

			expect(await findByTestId('agent-skill-scope-option-agent')).toBeInTheDocument();
			expect(queryByTestId('agent-skill-scope-option-instance')).not.toBeInTheDocument();
		});

		it('keeps a skill read-only and reports the error when its access check fails', async () => {
			const error = new Error('offline');
			getSkillDetail.mockRejectedValue(error);
			const { findByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
				skillId: 'sql',
				skill: { name: 'SQL helper', description: 'Use for SQL', instructions: 'Write SQL' },
				onRemove: vi.fn(),
			});

			await findByTestId('agent-skill-menu-attach');
			await vi.waitFor(() =>
				expect(showError).toHaveBeenCalledWith(error, 'agents.builder.skills.accessError'),
			);
			expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
		});

		it('shows a skill that the user cannot edit as read-only', async () => {
			getSkillDetail.mockResolvedValue(
				makeDetail({ id: 'sql', name: 'SQL helper', scope: 'instance', canEdit: false }),
			);
			const onRemove = vi.fn();
			const { findByTestId, getByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
				skillId: 'sql',
				skill: { name: 'SQL helper', description: 'Use for SQL', instructions: 'Write SQL' },
				onRemove,
			});

			expect(await findByTestId('agent-skill-footer-hint')).toHaveTextContent(
				'agents.builder.skills.hint.readOnly.instance',
			);
			expect(getByTestId('agent-skill-description-text')).toHaveTextContent('Use for SQL');
			expect(queryByTestId('agent-skill-description-input')).not.toBeInTheDocument();
			expect(getSkillDetail).toHaveBeenCalledWith(expect.anything(), 'sql');
			expect(queryByTestId('agent-skill-name-input')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-add-reference')).not.toBeInTheDocument();

			await fireEvent.click(getByTestId('agent-skill-menu-attach'));
			expect(onRemove).toHaveBeenCalledWith('sql');
		});

		describe('where an existing skill can be added', () => {
			const tone = {
				name: 'Support tone',
				description: 'Use for replies',
				instructions: 'Be kind',
			};

			async function renderEdit(
				detail: SkillDetail,
				onConfirm = vi.fn(),
				extra: Pick<AgentSkillModalData, 'canCreateInstanceSkills'> = {},
			) {
				getSkillDetail.mockResolvedValue(detail);
				const result = renderModal({
					skillRefsEnabled: true,
					skillId: detail.id,
					skill: tone,
					onConfirm,
					onRemove: vi.fn(),
					...extra,
				});
				await result.findByTestId('agent-skill-scope');
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
				const { getByTestId } = await renderEdit(
					{
						...makeDetail({ id: 'tone', name: 'Support tone', scope: 'project' }),
						usedBy: {
							drafts: [
								{
									agentId: 'a1',
									agentName: 'This agent',
									projectId: 'p1',
									version: 1,
									pinned: false,
								},
							],
							pins: [{ agentId: 'a1', agentName: 'This agent', projectId: 'p1', version: 1 }],
							hiddenAgents: 0,
						},
					},
					onConfirm,
				);

				await fireEvent.click(getByTestId('agent-skill-scope-option-agent'));
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

			async function pickTarget(
				result: Awaited<ReturnType<typeof renderEdit>>,
				label: string,
			): Promise<void> {
				const option = result
					.getAllByTestId(/^agent-skill-scope-option-/)
					.find((element) => element.textContent?.trim() === label);
				if (!option) throw new Error(`Expected the ${label} option`);
				await fireEvent.click(option);
			}

			it.each([
				[
					'a draft of another agent',
					{
						drafts: [
							{ agentId: 'a2', agentName: 'Other', projectId: 'p1', version: 1, pinned: false },
						],
						pins: [],
						hiddenAgents: 0,
					},
					'agents.builder.skills.loseAccess.agentOnly',
				],
				[
					'a pin of another agent',
					{
						drafts: [],
						pins: [{ agentId: 'a2', agentName: 'Other', projectId: 'p1', version: null }],
						hiddenAgents: 0,
					},
					'agents.builder.skills.loseAccess.agentOnly',
				],
				[
					'an agent the user cannot see',
					{ drafts: [], pins: [], hiddenAgents: 1 },
					'agents.builder.skills.loseAccess.hidden',
				],
			])('warns and blocks save when the target drops %s', async (_case, usedBy, message) => {
				const onConfirm = vi.fn();
				const result = await renderEdit(
					{ ...makeDetail({ id: 'tone', name: 'Support tone', scope: 'project' }), usedBy },
					onConfirm,
				);

				await pickTarget(result, 'agents.builder.skills.availableTo.agent');

				expect(result.getByTestId('agent-skill-access-warning')).toHaveTextContent(message);
				expect(result.getByTestId('agent-skill-create-save')).toBeDisabled();
				await fireEvent.click(result.getByTestId('agent-skill-create-save'));
				expect(onConfirm).not.toHaveBeenCalled();
			});

			it('lets the user widen a skill that other agents use to the instance', async () => {
				const onConfirm = vi.fn();
				const result = await renderEdit(
					{
						...makeDetail({ id: 'tone', name: 'Support tone', scope: 'project' }),
						usedBy: {
							drafts: [
								{ agentId: 'a2', agentName: 'Other', projectId: 'p1', version: 1, pinned: false },
							],
							pins: [],
							hiddenAgents: 1,
						},
					},
					onConfirm,
					{ canCreateInstanceSkills: true },
				);

				await pickTarget(result, 'agents.builder.skills.availableTo.instance');

				expect(result.queryByTestId('agent-skill-access-warning')).not.toBeInTheDocument();
				await fireEvent.click(result.getByTestId('agent-skill-create-save'));
				expect(onConfirm).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'tone', availableTo: 'instance' }),
				);
			});

			it('lets the user narrow an agent skill to the project of every agent that uses it', async () => {
				const onConfirm = vi.fn();
				const result = await renderEdit(
					{
						...makeDetail({ id: 'tone', name: 'Support tone', scope: 'agent', agentId: 'a1' }),
						usedBy: {
							drafts: [
								{
									agentId: 'a1',
									agentName: 'This agent',
									projectId: 'p1',
									version: 1,
									pinned: false,
								},
							],
							pins: [{ agentId: 'a2', agentName: 'Other', projectId: 'p1', version: 1 }],
							hiddenAgents: 0,
						},
					},
					onConfirm,
				);

				await pickTarget(result, 'agents.builder.skills.availableTo.project');

				expect(result.queryByTestId('agent-skill-access-warning')).not.toBeInTheDocument();
				await fireEvent.click(result.getByTestId('agent-skill-create-save'));
				expect(onConfirm).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'tone', availableTo: 'project' }),
				);
			});
		});

		it('shows a skill on an older version as read-only with a switch to the latest version', async () => {
			getSkillDetail.mockResolvedValue(
				makeDetail({ id: 'tone', name: 'Support tone', scope: 'project', canEdit: true }),
			);
			const onUseLatestVersion = vi.fn();
			const { findByTestId, getByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
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
			expect(queryByTestId('agent-skill-name-input')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
			expect(getByTestId('agent-skill-menu-attach')).toBeInTheDocument();

			await fireEvent.click(getByTestId('agent-skill-use-latest'));

			// The editor stays open. The builder sends the saved version to it.
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(onUseLatestVersion).toHaveBeenCalledWith('tone');
		});

		it('shows the skill that the builder sends after a version change, without closing', async () => {
			getSkillDetail.mockResolvedValue(
				makeDetail({ id: 'tone', name: 'Support tone', scope: 'project', canEdit: true }),
			);
			const data = {
				projectId: 'p1',
				agentId: 'a1',
				skillRefsEnabled: true,
				skillId: 'tone',
				skill: { name: 'Support tone', description: 'Use for replies', instructions: 'Be kind' },
				outdated: true,
				onUseLatestVersion: vi.fn(),
				onConfirm: vi.fn(),
			};
			const { findByTestId, getByTestId, rerender } = renderModal(data);
			expect(await findByTestId('agent-skill-description-text')).toHaveTextContent(
				'Use for replies',
			);

			await rerender({
				modalName: MODAL_NAME,
				data: {
					...data,
					skill: { ...data.skill, description: 'Use for every reply' },
					outdated: false,
				},
			});

			const description = await findByTestId('agent-skill-description-input');
			expect(description.querySelector('input')).toHaveValue('Use for every reply');
			expect(getByTestId('agent-skill-create-save')).toBeDisabled();
			expect(uiStore.closeModal).not.toHaveBeenCalled();
		});

		it('keeps a skill that the user can edit editable', async () => {
			getSkillDetail.mockResolvedValue(
				makeDetail({ id: 'tone', name: 'Support tone', scope: 'project', canEdit: true }),
			);
			const { findByTestId, queryByTestId } = renderModal({
				skillRefsEnabled: true,
				skillId: 'tone',
				skill: { name: 'Support tone', description: 'Use for replies', instructions: 'Be kind' },
			});

			await waitFor(() => expect(getSkillDetail).toHaveBeenCalled());
			expect(await findByTestId('agent-skill-name-input')).toBeInTheDocument();
			expect(queryByTestId('agent-skill-footer-hint')).not.toBeInTheDocument();
			expect(queryByTestId('agent-skill-description-input')).toBeInTheDocument();
			expect(queryByTestId('agent-skill-create-save')).toBeInTheDocument();
		});
	});
});

describe('AgentSkillModal from Settings', () => {
	it('shows a read-only skill without edit controls', () => {
		const { getByTestId, queryByTestId } = renderModal({
			skillId: 's1',
			skill: SAVED_SKILL,
			settings: { readOnly: true },
		});

		expect(getByTestId('agent-skill-read-only-callout')).toHaveTextContent(
			'settings.context.skills.readOnly',
		);
		expect(queryByTestId('agent-skill-name-input')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-add-reference')).not.toBeInTheDocument();
	});

	it('shows where a synced skill comes from and keeps its content read-only', () => {
		const { getByTestId, queryByTestId } = renderModal({
			skillId: 's1',
			skill: SAVED_SKILL,
			settings: {
				readOnly: true,
				syncedFrom: {
					sourceId: 'src-1',
					type: 'github',
					label: 'acme/skills',
					webUrl: 'https://github.com/acme/skills/tree/main/brand-voice',
					canStopSyncing: false,
				},
			},
		});

		expect(getByTestId('agent-skill-synced-banner')).toHaveTextContent(
			'settings.context.skills.synced.banner acme/skills',
		);
		expect(queryByTestId('agent-skill-read-only-callout')).not.toBeInTheDocument();
		expect(getByTestId('agent-skill-open-in-github')).toHaveAttribute(
			'href',
			'https://github.com/acme/skills/tree/main/brand-voice',
		);
		expect(queryByTestId('agent-skill-name-input')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
	});

	it('offers Stop syncing on a synced skill the user may stop syncing', async () => {
		const onStopSyncing = vi.fn();
		const { getByTestId } = renderModal({
			skillId: 's1',
			skill: SAVED_SKILL,
			settings: {
				readOnly: true,
				syncedFrom: {
					sourceId: 'src-1',
					type: 'github',
					label: 'acme/skills',
					webUrl: 'https://github.com/acme/skills',
					canStopSyncing: true,
				},
				onStopSyncing,
			},
		});

		const button = getByTestId('agent-skill-stop-syncing');
		expect(button).toHaveTextContent('settings.context.skills.stopSyncing.action');
		await userEvent.click(button);

		expect(onStopSyncing).toHaveBeenCalledWith('s1');
	});

	it('disables Stop syncing while a stop runs, so it is sent once', async () => {
		let finish: () => void = () => {};
		const onStopSyncing = vi.fn(
			async () => await new Promise<void>((resolve) => (finish = resolve)),
		);
		const { getByTestId } = renderModal({
			skillId: 's1',
			skill: SAVED_SKILL,
			settings: {
				readOnly: true,
				syncedFrom: {
					sourceId: 'src-1',
					type: 'github',
					label: 'acme/skills',
					webUrl: 'https://github.com/acme/skills',
					canStopSyncing: true,
				},
				onStopSyncing,
			},
		});

		const button = getByTestId('agent-skill-stop-syncing');
		await userEvent.click(button);
		await userEvent.click(button);

		expect(onStopSyncing).toHaveBeenCalledTimes(1);
		expect(button).toBeDisabled();
		finish();
		await vi.waitFor(() => expect(button).not.toBeDisabled());
	});

	it('hides Stop syncing when the user may not stop syncing the skill', () => {
		const { getByTestId, queryByTestId } = renderModal({
			skillId: 's1',
			skill: SAVED_SKILL,
			settings: {
				readOnly: true,
				syncedFrom: {
					sourceId: 'src-1',
					type: 'github',
					label: 'acme/skills',
					webUrl: 'https://github.com/acme/skills',
					canStopSyncing: false,
				},
				onStopSyncing: vi.fn(),
			},
		});

		expect(getByTestId('agent-skill-open-in-github')).toBeInTheDocument();
		expect(queryByTestId('agent-skill-stop-syncing')).not.toBeInTheDocument();
	});

	it('reads where a synced skill comes from in the agent builder, and the server keeps it read-only', async () => {
		getSkillDetail.mockResolvedValue({
			...makeDetail({ id: 's1', name: 'Brand voice', scope: 'project', canEdit: false }),
			syncedFrom: {
				sourceId: 'src-1',
				type: 'github',
				label: 'acme/skills',
				webUrl: 'https://github.com/acme/skills',
				canStopSyncing: true,
			},
		});
		const { findByTestId, queryByTestId } = renderModal({
			skillRefsEnabled: true,
			skillId: 's1',
			skill: SAVED_SKILL,
		});

		expect(await findByTestId('agent-skill-synced-banner')).toHaveTextContent(
			'settings.context.skills.synced.banner acme/skills',
		);
		expect(queryByTestId('agent-skill-read-only-callout')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-name-input')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
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
		await chooseScopeOption('Personal project');
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

		const badge = getByTestId('agent-skill-scope-badge');
		expect(badge).toHaveTextContent('FirstClassDarwin only');
		// A locked scope is a plain badge, not a button that opens the scope menu.
		expect(badge.tagName).toBe('SPAN');
	});

	describe('moving a saved skill from Settings', () => {
		const settings = {
			scopeOptions: [
				{
					value: 'project:p1',
					label: 'Marketing',
					icon: 'layers' as const,
					target: { projectId: 'p1', agentId: null },
				},
				{
					value: 'project:p2',
					label: 'Personal project',
					icon: 'user' as const,
					target: { projectId: 'p2', agentId: null },
				},
				{
					value: 'instance',
					label: 'Global',
					icon: 'globe' as const,
					target: { projectId: null, agentId: null },
				},
			],
			initialScope: 'project:p1',
			usedBy: {
				drafts: [
					{
						agentId: 'a1',
						agentName: 'FirstClassDarwin',
						projectId: 'p1',
						version: 1,
						pinned: false,
					},
				],
				pins: [],
				hiddenAgents: 0,
			},
		};

		const pickScope = chooseScopeOption;

		it('warns and blocks save when the new scope drops an agent', async () => {
			const onConfirm = vi.fn();
			const { getByTestId } = renderModal({
				skillId: 's1',
				skill: SAVED_SKILL,
				onConfirm,
				settings,
			});

			await pickScope('Personal project');

			expect(getByTestId('agent-skill-access-warning')).toHaveTextContent(
				'agents.builder.skills.loseAccess',
			);
			expect(getByTestId('agent-skill-create-save')).toBeDisabled();
		});

		it('lets the user widen a skill in use to the instance', async () => {
			const onConfirm = vi.fn();
			const { getByTestId, queryByTestId } = renderModal({
				skillId: 's1',
				skill: SAVED_SKILL,
				onConfirm,
				settings,
			});

			await pickScope('Global');

			expect(queryByTestId('agent-skill-access-warning')).not.toBeInTheDocument();
			await fireEvent.click(getByTestId('agent-skill-create-save'));
			expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ scope: 'instance' }));
		});
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

	it('hides the MCP toggle when Settings gives no MCP availability', () => {
		const { queryByTestId } = renderModal({
			skillId: 's1',
			skill: SAVED_SKILL,
			settings: {
				scopeOptions: [{ value: 'instance', label: 'Global', icon: 'globe' }],
				initialScope: 'instance',
			},
		});

		expect(queryByTestId('skill-available-to-mcp')).not.toBeInTheDocument();
	});

	it('saves a change of the MCP toggle as a change of the skill', async () => {
		const onConfirm = vi.fn();
		const { getByTestId, getByText } = renderModal({
			onConfirm,
			skillId: 's1',
			skill: SAVED_SKILL,
			settings: {
				scopeOptions: [{ value: 'instance', label: 'Global', icon: 'globe' }],
				initialScope: 'instance',
				availableToMCP: false,
			},
		});

		expect(getByText('settings.context.skills.modal.mcp.toggle')).toBeInTheDocument();
		expect(getByTestId('agent-skill-create-save')).toBeDisabled();
		await userEvent.click(getByTestId('skill-available-to-mcp'));
		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).toHaveBeenCalledWith(
			expect.objectContaining({ id: 's1', skill: SAVED_SKILL, availableToMCP: true }),
		);
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
		availableToAssistant: false,
		usedByAgents: 0,
		availableToMCP: false,
		canEdit: true,
		canDelete: true,
		canStopSyncing: false,
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
		syncedFrom: null,
	};
}

/** Picks a scope from the scope badge menu by its label. */
async function chooseScopeOption(label: string) {
	const option = screen
		.getAllByTestId(/^agent-skill-scope-option-/)
		.find((element) => element.textContent?.trim() === label);
	if (!option) throw new Error(`Expected the ${label} option`);
	await userEvent.click(option);
}

function getTitleInput(container: Element): HTMLInputElement {
	const input = container.querySelector<HTMLInputElement>(
		'[data-testid="agent-skill-name-input"] input',
	);
	if (!input) throw new Error('Expected an editable skill name');
	return input;
}

function makeReferences(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		path: index === 0 ? 'references/reference.md' : `references/reference-${index + 1}.md`,
		content: 'Reference',
	}));
}

describe('Assistant availability', () => {
	const savedSkill = { name: 'Tone', description: 'Writing style', instructions: 'Be brief.' };
	const settings = {
		scopeOptions: [{ value: 'instance', label: 'Global', icon: 'globe' as const }],
		initialScope: 'instance',
	};

	const agentSettings = {
		scopeOptions: [
			{ value: 'agent', label: 'This agent only', icon: 'bot' as const },
			{ value: 'project:p1', label: 'Marketing', icon: 'layers' as const },
			{ value: 'instance', label: 'Global', icon: 'globe' as const },
		],
		initialScope: 'agent',
		availableToAssistant: false,
	};

	const selectScope = chooseScopeOption;

	it.each([
		['Marketing', 'project:p1'],
		['Global', 'instance'],
	])('shows the toggle before saving a move to %s', async (label, scope) => {
		const onConfirm = vi.fn();
		const { getByTestId, queryByTestId } = renderModal({
			skill: savedSkill,
			skillId: 'skill-1',
			onConfirm,
			settings: agentSettings,
		});
		expect(queryByTestId('skill-assistant-availability')).not.toBeInTheDocument();
		await selectScope(label);
		expect(getByTestId('skill-assistant-availability')).toBeInTheDocument();
		expect(onConfirm).not.toHaveBeenCalled();
		await userEvent.click(getByTestId('skill-assistant-availability'));
		await userEvent.click(getByTestId('agent-skill-create-save'));
		await waitFor(() =>
			expect(onConfirm).toHaveBeenCalledWith(
				expect.objectContaining({ scope, availableToAssistant: true, skill: savedSkill }),
			),
		);
	});

	it.each([
		['Marketing', 'project:p1'],
		['Global', 'instance'],
	])('shows the MCP toggle before saving a move to %s', async (label, scope) => {
		const onConfirm = vi.fn();
		const { getByTestId, queryByTestId } = renderModal({
			skill: savedSkill,
			skillId: 'skill-1',
			onConfirm,
			settings: { ...agentSettings, availableToMCP: false },
		});
		expect(queryByTestId('skill-available-to-mcp')).not.toBeInTheDocument();
		await selectScope(label);
		await userEvent.click(getByTestId('skill-available-to-mcp'));
		await userEvent.click(getByTestId('agent-skill-create-save'));
		await waitFor(() =>
			expect(onConfirm).toHaveBeenCalledWith(
				expect.objectContaining({ scope, availableToMCP: true, skill: savedSkill }),
			),
		);
	});

	it('saves a toggle-only change with the existing form', async () => {
		const onConfirm = vi.fn();
		const { getByTestId } = renderModal({
			skill: savedSkill,
			skillId: 'skill-1',
			onConfirm,
			settings: { ...settings, availableToAssistant: false },
		});
		const save = getByTestId('agent-skill-create-save');
		expect(save).toBeDisabled();
		await userEvent.click(getByTestId('skill-assistant-availability'));
		expect(save).not.toBeDisabled();
		await userEvent.click(save);
		await waitFor(() =>
			expect(onConfirm).toHaveBeenCalledWith(
				expect.objectContaining({ availableToAssistant: true, skill: savedSkill }),
			),
		);
	});

	it('hides the toggle for a read-only skill', () => {
		const { queryByTestId } = renderModal({
			skill: savedSkill,
			skillId: 'skill-1',
			settings: { ...settings, availableToAssistant: true, readOnly: true },
		});
		expect(queryByTestId('skill-assistant-availability')).not.toBeInTheDocument();
	});

	it('does not show the toggle when the caller does not enable it', () => {
		const { queryByTestId } = renderModal({ skill: savedSkill, skillId: 'skill-1', settings });
		expect(queryByTestId('skill-assistant-availability')).not.toBeInTheDocument();
	});
});

describe('header and footer', () => {
	const savedSkill = { name: 'Tone', description: 'Writing style', instructions: 'Be brief.' };
	const settings = {
		scopeOptions: [{ value: 'instance', label: 'Global', icon: 'globe' as const }],
		initialScope: 'instance',
	};

	beforeEach(() => {
		getSkillDetail.mockResolvedValue(makeDetail({ id: 'tone', name: 'Tone', scope: 'project' }));
	});

	it('names the footer button Close on the form', () => {
		const { getByTestId } = renderModal({ skill: savedSkill, skillId: 'tone', settings });

		expect(getByTestId('agent-modal-cancel')).toHaveTextContent('generic.close');
	});

	it('keeps the same size on the form, so opening a version does not resize it', () => {
		const { getByTestId } = renderModal({ skill: savedSkill, skillId: 'tone', settings });

		expect(getByTestId('agent-skill-modal')).toHaveAttribute('data-fixed-size', 'true');
	});

	it('detaches a hub skill with the agent toggle in the header menu', async () => {
		const onRemove = vi.fn();
		const { findByTestId, queryByTestId } = renderModal({
			skillRefsEnabled: true,
			skill: savedSkill,
			skillId: 'tone',
			agentName: 'Darwin',
			onRemove,
		});

		const toggle = await findByTestId('agent-skill-menu-attach');
		expect(toggle).toHaveTextContent('agents.builder.skills.menu.addToAgent');
		// The row shows a switch that is on, not a check mark.
		expect(toggle).not.toHaveAttribute('data-checked');
		expect(within(toggle).getByRole('switch', { hidden: true })).toBeChecked();
		expect(queryByTestId('agent-skill-remove')).not.toBeInTheDocument();
		// The skill is attached to this agent, so the builder cannot delete it.
		expect(await findByTestId('agent-skill-menu-delete')).toBeDisabled();

		await userEvent.click(toggle);

		expect(onRemove).toHaveBeenCalledWith('tone');
	});

	it('deletes a skill from the header menu in Settings', async () => {
		const onDelete = vi.fn();
		const { getByTestId, queryByTestId } = renderModal({
			skill: savedSkill,
			skillId: 'tone',
			settings: { ...settings, onDelete },
		});

		expect(queryByTestId('agent-skill-menu-attach')).not.toBeInTheDocument();
		await userEvent.click(getByTestId('agent-skill-menu-delete'));

		expect(onDelete).toHaveBeenCalledWith('tone');
	});

	it('disables delete when agents use the skill and gives the reason on hover', async () => {
		const { getByTestId } = renderModal({
			skill: savedSkill,
			skillId: 'tone',
			settings: { ...settings, onDelete: vi.fn(), deleteDisabledReason: 'Used by 1 agent' },
		});

		expect(getByTestId('agent-skill-menu-delete')).toBeDisabled();
		// The reason is a tooltip, not a line under the label.
		expect(getByTestId('agent-skill-menu-delete')).toHaveTextContent(
			/^agents.builder.skills.menu.delete$/,
		);
		await userEvent.hover(getByTestId('agent-skill-menu-delete-reason'));
		expect(await screen.findByText('Used by 1 agent')).toBeInTheDocument();
	});

	it('changes the scope from the header menu', async () => {
		const onConfirm = vi.fn();
		const { getByTestId } = renderModal({
			skill: savedSkill,
			skillId: 'tone',
			onConfirm,
			settings: {
				scopeOptions: [
					{ value: 'instance', label: 'Global', icon: 'globe' as const },
					{ value: 'project:p1', label: 'Marketing', icon: 'layers' as const },
				],
				initialScope: 'instance',
			},
		});

		await userEvent.click(getByTestId('agent-skill-menu-scope-option-project:p1'));

		expect(getByTestId('agent-skill-scope-badge')).toHaveTextContent('Marketing');
		await userEvent.click(getByTestId('agent-skill-create-save'));
		await waitFor(() =>
			expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ scope: 'project:p1' })),
		);
	});
});

describe('Versions panel', () => {
	const latest = { name: 'Tone', description: 'Writing style', instructions: 'Be brief.' };
	const old = { name: 'Tone', description: 'Old style', instructions: 'Be long.' };
	const settings = {
		scopeOptions: [{ value: 'instance', label: 'Global', icon: 'globe' as const }],
		initialScope: 'instance',
		latestVersion: 2,
	};
	const author = { id: 'u1', email: 'ana@acme.test', firstName: 'Ana', lastName: 'Lima' };

	beforeEach(() => {
		listSkillVersions.mockResolvedValue([
			{ id: 'v2', version: 2, createdBy: author, createdAt: '2026-10-27T11:07:00.000Z' },
			{ id: 'v1', version: 1, createdBy: null, createdAt: '2026-10-20T11:07:00.000Z' },
		]);
		getSkillVersion.mockResolvedValue({
			id: 'v1',
			version: 1,
			createdBy: author,
			createdAt: '2026-10-20T11:07:00.000Z',
			skill: old,
		});
	});

	it('shows the latest version in the header and toggles the panel', async () => {
		const { findByTestId, queryByTestId } = renderModal({
			skill: latest,
			skillId: 'tone',
			settings,
		});

		const button = await findByTestId('agent-skill-versions-button');
		expect(button).toHaveTextContent('agents.builder.skills.versions.number 2');
		expect(queryByTestId('skill-version-timeline')).not.toBeInTheDocument();

		await userEvent.click(button);

		expect(await findByTestId('skill-version-row-2')).toHaveTextContent(
			'agents.builder.skills.versions.latest',
		);
		expect(await findByTestId('skill-version-row-1')).toHaveTextContent(
			'agents.builder.skills.versions.unknownUser',
		);
	});

	it('opens an older version read-only and goes back with Done', async () => {
		const { findByTestId, getByTestId, queryByTestId } = renderModal({
			skill: latest,
			skillId: 'tone',
			settings: { ...settings, initialVersionsOpen: true },
		});

		await userEvent.click(await findByTestId('skill-version-row-1'));

		expect(await findByTestId('agent-skill-viewing-version')).toHaveTextContent('Ana Lima');
		expect(getByTestId('agent-skill-description-text')).toHaveTextContent('Old style');
		expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
		expect(queryByTestId('agent-modal-cancel')).not.toBeInTheDocument();
		expect(getSkillVersion).toHaveBeenCalledWith(expect.anything(), 'tone', 1);

		await userEvent.click(getByTestId('agent-skill-version-done'));

		expect(queryByTestId('agent-skill-viewing-version')).not.toBeInTheDocument();
		expect(getByTestId('agent-skill-create-save')).toBeInTheDocument();
	});

	it('saves an older version as a new version', async () => {
		const onConfirm = vi.fn();
		const { findByTestId } = renderModal({
			skill: latest,
			skillId: 'tone',
			onConfirm,
			settings: { ...settings, initialVersionsOpen: true },
		});

		await userEvent.click(await findByTestId('skill-version-row-1'));
		await userEvent.click(await findByTestId('agent-skill-version-restore'));

		await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ id: 'tone', skill: old }));
	});

	it('lets a read-only user open older versions but not restore them', async () => {
		const { findByTestId, queryByTestId } = renderModal({
			skill: latest,
			skillId: 'tone',
			settings: { ...settings, readOnly: true, initialVersionsOpen: true },
		});

		await userEvent.click(await findByTestId('skill-version-row-1'));

		expect(await findByTestId('agent-skill-viewing-version')).toBeInTheDocument();
		expect(queryByTestId('agent-skill-version-restore')).not.toBeInTheDocument();
	});

	it('loads the version list only when the panel opens', async () => {
		const { findByTestId } = renderModal({ skill: latest, skillId: 'tone', settings });

		const button = await findByTestId('agent-skill-versions-button');
		expect(listSkillVersions).not.toHaveBeenCalled();

		await userEvent.click(button);

		await waitFor(() => expect(listSkillVersions).toHaveBeenCalledWith(expect.anything(), 'tone'));
	});

	it('has no versions for a new skill', () => {
		const { queryByTestId } = renderModal({ settings });

		expect(queryByTestId('agent-skill-versions-button')).not.toBeInTheDocument();
	});
});

describe('Compare mode', () => {
	const settings = {
		scopeOptions: [{ value: 'instance', label: 'Global', icon: 'globe' as const }],
		initialScope: 'instance',
		latestVersion: 2,
	};
	const v1 = { name: 'research-sources', description: 'Cite the source.', instructions: 'Read.' };
	const v2 = { name: 'research-search', description: 'Cite the evidence.', instructions: 'Read.' };

	beforeEach(() => {
		listSkillVersions.mockResolvedValue([
			{ id: 'v2', version: 2, createdBy: null, createdAt: '2026-10-27T11:07:00.000Z' },
			{ id: 'v1', version: 1, createdBy: null, createdAt: '2026-10-20T11:07:00.000Z' },
		]);
		getSkillVersion.mockImplementation(async (_context: unknown, _id: string, version: number) => ({
			id: `v${version}`,
			version,
			createdBy: null,
			createdAt: '2026-10-20T11:07:00.000Z',
			skill: version === 1 ? v1 : v2,
		}));
	});

	it('opens comparing the latest version with the one before it', async () => {
		const { findByTestId, getByTestId, queryByTestId } = renderModal({
			skill: v2,
			skillId: 'tone',
			settings: { ...settings, initialCompare: true },
		});

		expect(await findByTestId('agent-skill-compare-bar')).toBeInTheDocument();
		expect(getByTestId('skill-version-diff-name')).toHaveTextContent('research-sources');
		expect(getByTestId('skill-version-diff-name')).toHaveTextContent('research-search');
		expect(getByTestId('skill-version-diff-instructions')).not.toHaveTextContent('−');
		// The footer is hidden while comparing.
		expect(queryByTestId('agent-skill-create-save')).not.toBeInTheDocument();
	});

	it('compares a version from the panel with the version the editor shows, and leaves with Done', async () => {
		const { findByTestId, getByTestId, queryByTestId } = renderModal({
			skill: v2,
			skillId: 'tone',
			settings: { ...settings, initialVersionsOpen: true },
		});

		await userEvent.click(await findByTestId('skill-version-compare-1'));

		expect(await findByTestId('skill-version-diff')).toBeInTheDocument();
		expect(getSkillVersion).toHaveBeenCalledWith(expect.anything(), 'tone', 1);
		expect(getSkillVersion).toHaveBeenCalledWith(expect.anything(), 'tone', 2);

		await userEvent.click(getByTestId('agent-skill-compare-done'));

		expect(queryByTestId('agent-skill-compare-bar')).not.toBeInTheDocument();
		expect(getByTestId('agent-skill-create-save')).toBeInTheDocument();
	});
	it('returns to the latest version with Done when the user compared from an older one', async () => {
		const { findByTestId, getByTestId, queryByTestId } = renderModal({
			skill: v2,
			skillId: 'tone',
			settings: { ...settings, initialVersionsOpen: true },
		});

		await userEvent.click(await findByTestId('skill-version-row-1'));
		expect(await findByTestId('agent-skill-viewing-version')).toBeInTheDocument();
		await userEvent.click(getByTestId('skill-version-compare-2'));
		await userEvent.click(await findByTestId('agent-skill-compare-done'));

		expect(queryByTestId('agent-skill-viewing-version')).not.toBeInTheDocument();
		expect(getByTestId('agent-skill-create-save')).toBeInTheDocument();
	});
});

describe('Versions in the agent builder', () => {
	const skill = { name: 'Tone', description: 'Writing style', instructions: 'Be brief.' };
	const old = { name: 'Tone', description: 'Old style', instructions: 'Be long.' };

	beforeEach(() => {
		getSkillDetail.mockResolvedValue(makeDetail({ id: 'tone', name: 'Tone', scope: 'project' }));
		listSkillVersions.mockResolvedValue([
			{ id: 'id-3', version: 3, createdBy: null, createdAt: '2026-10-27T11:07:00.000Z' },
			{ id: 'id-2', version: 2, createdBy: null, createdAt: '2026-10-25T11:07:00.000Z' },
			{ id: 'id-1', version: 1, createdBy: null, createdAt: '2026-10-20T11:07:00.000Z' },
		]);
		getSkillVersion.mockImplementation(async (_context: unknown, _id: string, version: number) => ({
			id: `id-${version}`,
			version,
			createdBy: null,
			createdAt: '2026-10-20T11:07:00.000Z',
			skill: old,
		}));
	});

	function renderBuilder(agentVersions: {
		draft: number;
		published: number | null;
		pinned: boolean;
	}) {
		const onUseVersion = vi.fn();
		const onUseLatestVersion = vi.fn();
		const result = renderModal({
			skillRefsEnabled: true,
			skill,
			skillId: 'tone',
			agentName: 'Darwin',
			latestVersion: 3,
			agentVersions,
			onUseVersion,
			onUseLatestVersion,
			onRemove: vi.fn(),
		});
		return { ...result, onUseVersion, onUseLatestVersion };
	}

	it('says the agent follows the latest version and marks the draft and published versions', async () => {
		const { findByTestId, getByTestId } = renderBuilder({ draft: 3, published: 2, pinned: false });

		const button = await findByTestId('agent-skill-versions-button');
		expect(button).toHaveTextContent('agents.builder.skills.versions.usingLatest 3');
		await userEvent.click(button);

		expect(await findByTestId('skill-version-row-2')).toHaveTextContent(
			'agents.builder.skills.versions.inPublishedAgent',
		);
		expect(getByTestId('skill-version-row-3')).not.toHaveTextContent(
			'agents.builder.skills.versions.inPublishedAgent',
		);
	});

	it('gives one version both markers when the draft and the published agent run it', async () => {
		const { findByTestId, getByTestId } = renderBuilder({ draft: 2, published: 2, pinned: true });

		await userEvent.click(await findByTestId('agent-skill-versions-button'));

		const dot = (await findByTestId('skill-version-row-2')).querySelector('[aria-hidden="true"]');
		expect(dot?.className).toMatch(/draftDot/);
		expect(dot?.className).toMatch(/publishedDot/);
		expect(
			getByTestId('skill-version-row-3').querySelector('[aria-hidden="true"]')?.className,
		).not.toMatch(/draftDot|publishedDot/);
	});

	it('marks no version as published for an agent that is not published', async () => {
		const { findByTestId, queryByTestId } = renderBuilder({
			draft: 3,
			published: null,
			pinned: false,
		});

		await userEvent.click(await findByTestId('agent-skill-versions-button'));
		await findByTestId('skill-version-row-1');

		expect(queryByTestId('skill-version-published')).not.toBeInTheDocument();
	});

	it('pins the agent to a version from the row menu', async () => {
		const { findByTestId, onUseVersion } = renderBuilder({ draft: 3, published: 2, pinned: false });

		await userEvent.click(await findByTestId('agent-skill-versions-button'));
		await findByTestId('skill-version-row-1');
		await userEvent.click(
			[...document.querySelectorAll('button')].find(
				(button) => button.textContent?.trim() === 'agents.builder.skills.versions.useIn Darwin',
			)!,
		);

		await waitFor(() =>
			expect(onUseVersion).toHaveBeenCalledWith('tone', expect.objectContaining({ id: 'id-2' })),
		);
	});

	it('shows a pinned skill read-only and goes back to the latest version from the bar', async () => {
		const { findByTestId, getByTestId, onUseLatestVersion } = renderBuilder({
			draft: 1,
			published: 1,
			pinned: true,
		});

		expect(await findByTestId('agent-skill-versions-button')).toHaveTextContent(
			'agents.builder.skills.versions.usingVersion 1',
		);
		expect(await findByTestId('agent-skill-pinned-bar')).toHaveTextContent(
			'agents.builder.skills.versions.pinned Darwin 1',
		);
		// The line over the form takes the color of the warning strip.
		expect(getByTestId('agent-skill-modal')).toHaveAttribute('data-header-divider-tone', 'warning');
		// The fields stay in the form, disabled, and Save skill is disabled.
		expect(await findByTestId('agent-skill-name-input')).toBeInTheDocument();
		expect(
			getByTestId('agent-skill-description-input').querySelector('input, textarea'),
		).toBeDisabled();
		expect(getByTestId('agent-skill-create-save')).toBeDisabled();

		await userEvent.click(await findByTestId('agent-skill-pinned-use-latest'));

		expect(onUseLatestVersion).toHaveBeenCalledWith('tone');
	});

	it('lets a pinned agent open the latest version and compare against the pinned one', async () => {
		const { findByTestId, getByTestId } = renderBuilder({ draft: 1, published: 1, pinned: true });

		await userEvent.click(await findByTestId('agent-skill-versions-button'));
		await userEvent.click(await findByTestId('skill-version-row-3'));

		// The latest version is not the one on screen, so the row opens it.
		expect(await findByTestId('agent-skill-viewing-version')).toHaveTextContent(
			'agents.builder.skills.versions.viewingLatest 3',
		);
		expect(getSkillVersion).toHaveBeenCalledWith(expect.anything(), 'tone', 3);
		// Saving the latest again makes no new version, so there is no Restore.
		expect(getByTestId('agent-skill-version-done')).toBeInTheDocument();
		expect(document.querySelector('[data-testid="agent-skill-version-restore"]')).toBeNull();

		await userEvent.click(getByTestId('agent-skill-version-done'));
		await userEvent.click(await findByTestId('skill-version-compare-2'));

		// The second side of the compare is the pinned version on screen, not the latest.
		await waitFor(() => expect(getSkillVersion).toHaveBeenCalledWith(expect.anything(), 'tone', 1));
		expect(getByTestId('agent-skill-compare-from')).toHaveTextContent('1');
	});

	it('asks before a pin drops unsaved edits, and pins only when the user agrees', async () => {
		const { findByTestId, getByTestId, onUseVersion } = renderBuilder({
			draft: 3,
			published: 2,
			pinned: false,
		});
		await fireEvent.update(
			(await findByTestId('agent-skill-description-input')).querySelector('input')!,
			'Writing style, edited',
		);
		await userEvent.click(getByTestId('agent-skill-versions-button'));

		confirmSpy.mockResolvedValueOnce('cancel');
		await userEvent.click(await findByTestId('skill-version-use-latest'));
		await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
		expect(onUseVersion).not.toHaveBeenCalled();

		confirmSpy.mockResolvedValueOnce('confirm');
		await userEvent.click(getByTestId('skill-version-use-latest'));
		await waitFor(() =>
			expect(onUseVersion).toHaveBeenCalledWith('tone', expect.objectContaining({ id: 'id-3' })),
		);
	});

	it('pins the version the agent uses when the Use latest switch is turned off', async () => {
		const { findByTestId, onUseVersion } = renderBuilder({ draft: 3, published: 2, pinned: false });

		await userEvent.click(await findByTestId('agent-skill-versions-button'));
		await userEvent.click(await findByTestId('skill-version-use-latest'));

		await waitFor(() =>
			expect(onUseVersion).toHaveBeenCalledWith('tone', expect.objectContaining({ id: 'id-3' })),
		);
	});
});
