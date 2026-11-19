import { SKILL_NAME_TAKEN_MESSAGE, type SkillDetail } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { useSkillsStore } from '@/features/settings/context/skills.store';
import * as api from '@/features/settings/context/skills.api';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { configure, fireEvent, waitFor } from '@testing-library/vue';

import InstanceAiSkillPreview from '../components/InstanceAiSkillPreview.vue';

configure({ testIdAttribute: 'data-testid' });

vi.mock('@/features/settings/context/skills.api', () => ({
	getSkill: vi.fn(),
	saveSkill: vi.fn(),
}));

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const detail: SkillDetail = {
	id: 'skill-1',
	name: 'Brand voice',
	description: 'Write in the brand voice',
	scope: 'instance',
	projectId: null,
	projectName: null,
	projectType: null,
	source: 'assistant',
	createdBy: null,
	latestVersion: 2,
	usedByAgents: 0,
	availableToAssistant: true,
	availableToMCP: false,
	canEdit: true,
	canDelete: true,
	canStopSyncing: false,
	syncState: null,
	sourceId: null,
	createdAt: '2026-10-01T00:00:00.000Z',
	updatedAt: '2026-10-02T00:00:00.000Z',
	skill: {
		name: 'Brand voice',
		description: 'Write in the brand voice',
		instructions: 'Be kind.',
		references: [{ path: 'references/tone.md', content: 'Warm and short.' }],
	},
	skillHash: 'hash-2',
	usedBy: { drafts: [], pins: [], hiddenAgents: 0 },
	syncedFrom: null,
};

const renderComponent = createComponentRenderer(InstanceAiSkillPreview, {
	props: { skillId: 'skill-1' },
	global: {
		stubs: {
			MarkdownEditor: {
				props: ['modelValue', 'disabled'],
				emits: ['update:modelValue'],
				template:
					'<textarea :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
			},
		},
	},
});

describe('InstanceAiSkillPreview', () => {
	beforeEach(() => vi.clearAllMocks());

	function setup() {
		const pinia = createTestingPinia({ stubActions: false });
		const store = useSkillsStore();
		vi.mocked(api.getSkill).mockResolvedValue(detail);
		vi.mocked(api.saveSkill).mockImplementation(async (_context, id, payload) => ({
			id,
			versionId: 'version-3',
			version: 3,
			created: true,
			skill: { ...detail.skill, ...payload },
			skillHash: 'hash-3',
		}));
		return { pinia, store };
	}

	it('shows the inline editor without a header or version controls', async () => {
		const { pinia, store } = setup();
		const { findByTestId, getByTestId, queryByRole, queryByTestId } = renderComponent({ pinia });

		await findByTestId('agent-skill-viewer');

		expect(store.fetchSkill).toHaveBeenCalledWith('skill-1');
		expect(getByTestId('agent-skill-name-input').querySelector('input')).toHaveValue('Brand voice');
		expect(getByTestId('agent-skill-description-input').querySelector('input')).toHaveValue(
			'Write in the brand voice',
		);
		expect(getByTestId('agent-skill-instructions-editor')).toHaveValue('Be kind.');
		expect(queryByRole('dialog')).not.toBeInTheDocument();
		expect(queryByRole('heading')).not.toBeInTheDocument();
		expect(queryByRole('button', { name: /cancel|close|open in skills/i })).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-versions-button')).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-header-menu')).not.toBeInTheDocument();
	});

	it('disables Save skill until a field changes and disables it again after reverting', async () => {
		const { pinia } = setup();
		const { findByRole, getByTestId } = renderComponent({ pinia });
		const save = await findByRole('button', { name: 'Save skill' });
		const name = getByTestId('agent-skill-name-input').querySelector('input')!;

		expect(save).toBeDisabled();
		await fireEvent.update(name, 'Updated name');
		expect(save).toBeEnabled();
		await fireEvent.update(name, 'Brand voice');
		expect(save).toBeDisabled();
	});

	it('saves edited fields as a new version and keeps the editor open for another save', async () => {
		const { pinia, store } = setup();
		const { findByRole, getByTestId } = renderComponent({ pinia });
		const save = await findByRole('button', { name: 'Save skill' });
		const name = getByTestId('agent-skill-name-input').querySelector('input')!;
		await fireEvent.update(name, 'New brand voice');
		await fireEvent.update(
			getByTestId('agent-skill-description-input').querySelector('input')!,
			'Write friendly replies',
		);
		await fireEvent.update(getByTestId('agent-skill-instructions-editor'), 'Be warm.');
		await userEvent.click(save);

		await waitFor(() => expect(save).toBeDisabled());
		expect(store.saveSkill).toHaveBeenCalledWith('skill-1', {
			name: 'New brand voice',
			description: 'Write friendly replies',
			instructions: 'Be warm.',
			references: detail.skill.references,
			baseSkillHash: 'hash-2',
		});
		expect(store.skillNames.get('skill-1')).toBe('New brand voice');
		expect(name).toHaveValue('New brand voice');

		await fireEvent.update(name, 'Latest brand voice');
		await userEvent.click(save);
		await waitFor(() =>
			expect(store.saveSkill).toHaveBeenLastCalledWith(
				'skill-1',
				expect.objectContaining({ name: 'Latest brand voice', baseSkillHash: 'hash-3' }),
			),
		);
	});

	it('lets users edit, add, rename, and remove references', async () => {
		const { pinia, store } = setup();
		const { findByRole, getByTestId } = renderComponent({ pinia });
		const save = await findByRole('button', { name: 'Save skill' });
		await userEvent.click(getByTestId('agent-skill-reference-nav-item-references-tone-md'));
		await fireEvent.update(getByTestId('agent-skill-reference-editor'), 'Keep it brief.');
		await userEvent.click(getByTestId('agent-skill-add-reference'));
		await fireEvent.update(
			getByTestId('agent-skill-reference-name-input').querySelector('input')!,
			'examples',
		);
		await fireEvent.update(getByTestId('agent-skill-reference-editor'), 'A friendly reply.');
		await userEvent.click(save);

		await waitFor(() => expect(save).toBeDisabled());
		expect(store.saveSkill).toHaveBeenLastCalledWith(
			'skill-1',
			expect.objectContaining({
				references: [
					{ path: 'references/tone.md', content: 'Keep it brief.' },
					{ path: 'references/examples.md', content: 'A friendly reply.' },
				],
			}),
		);

		await userEvent.click(getByTestId('agent-skill-reference-nav-item-references-tone-md-remove'));
		await userEvent.click(
			getByTestId('agent-skill-reference-nav-item-references-examples-md-remove'),
		);
		await userEvent.click(save);
		await waitFor(() =>
			expect(store.saveSkill).toHaveBeenLastCalledWith(
				'skill-1',
				expect.objectContaining({ references: [] }),
			),
		);
	});

	it('keeps edits and the base hash when a save fails', async () => {
		const { pinia, store } = setup();
		vi.mocked(api.saveSkill).mockRejectedValueOnce(new Error('Save failed'));
		const { findByRole, getByTestId } = renderComponent({ pinia });
		const save = await findByRole('button', { name: 'Save skill' });
		const name = getByTestId('agent-skill-name-input').querySelector('input')!;
		await fireEvent.update(name, 'New brand voice');
		await userEvent.click(save);

		await waitFor(() => expect(showError).toHaveBeenCalled());
		expect(name).toHaveValue('New brand voice');
		expect(save).toBeEnabled();
		expect(store.skillNames.get('skill-1')).toBe('Brand voice');
		await userEvent.click(save);
		await waitFor(() => expect(save).toBeDisabled());
		expect(store.saveSkill).toHaveBeenLastCalledWith(
			'skill-1',
			expect.objectContaining({ baseSkillHash: 'hash-2' }),
		);
	});

	it('shows a taken-name error without discarding the edits', async () => {
		const { pinia } = setup();
		vi.mocked(api.saveSkill).mockRejectedValueOnce(
			new ResponseError(SKILL_NAME_TAKEN_MESSAGE, { httpStatusCode: 409 }),
		);
		const { findByRole, getByTestId, findByTestId } = renderComponent({ pinia });
		const save = await findByRole('button', { name: 'Save skill' });
		await fireEvent.update(
			getByTestId('agent-skill-name-input').querySelector('input')!,
			'Taken name',
		);
		await userEvent.click(save);

		expect(await findByTestId('agent-skill-name-error')).toHaveTextContent(
			SKILL_NAME_TAKEN_MESSAGE,
		);
		expect(save).toBeEnabled();
		expect(showError).not.toHaveBeenCalled();
	});

	it('locks the form and prevents another save while the request runs', async () => {
		const { pinia, store } = setup();
		let finishSave = () => {};
		const pending = new Promise<void>((resolve) => {
			finishSave = resolve;
		});
		const saved = vi.mocked(api.saveSkill).getMockImplementation()!;
		vi.mocked(api.saveSkill).mockImplementationOnce(async (...args) => {
			await pending;
			return await saved(...args);
		});
		const { findByRole, getByTestId } = renderComponent({ pinia });
		const save = await findByRole('button', { name: 'Save skill' });
		const name = getByTestId('agent-skill-name-input').querySelector('input')!;
		await fireEvent.update(name, 'New brand voice');
		await userEvent.click(save);

		expect(name).toBeDisabled();
		expect(save).toBeDisabled();
		await userEvent.click(save);
		expect(store.saveSkill).toHaveBeenCalledTimes(1);
		finishSave();
		await waitFor(() => expect(name).toBeEnabled());
		expect(save).toBeDisabled();
	});

	it('validates required fields before saving', async () => {
		const { pinia, store } = setup();
		const { findByRole, getByTestId } = renderComponent({ pinia });
		const save = await findByRole('button', { name: 'Save skill' });
		await fireEvent.update(getByTestId('agent-skill-name-input').querySelector('input')!, '');
		await userEvent.click(save);

		expect(getByTestId('agent-skill-name-error')).toHaveTextContent('Enter a name.');
		expect(store.saveSkill).not.toHaveBeenCalled();
	});

	it('shows a read-only document for users without edit access', async () => {
		const { pinia } = setup();
		vi.mocked(api.getSkill).mockResolvedValue({ ...detail, canEdit: false });
		const { findByTestId, getByTestId, queryByRole, queryByTestId } = renderComponent({ pinia });

		expect(await findByTestId('agent-skill-instructions-text')).toHaveTextContent('Be kind.');
		expect(queryByRole('textbox')).not.toBeInTheDocument();
		expect(queryByRole('button', { name: 'Save skill' })).not.toBeInTheDocument();
		expect(queryByTestId('agent-skill-add-reference')).not.toBeInTheDocument();
		await userEvent.click(getByTestId('agent-skill-reference-nav-item-references-tone-md'));
		expect(getByTestId('agent-skill-reference-text')).toHaveTextContent('Warm and short.');
	});

	it('reloads the skill when the refresh key changes and keeps the open reference', async () => {
		const { pinia, store } = setup();
		const { findByTestId, getByTestId, rerender, getByRole } = renderComponent({ pinia });
		await findByTestId('agent-skill-viewer');

		await userEvent.click(getByTestId('agent-skill-reference-nav-item-references-tone-md'));
		await fireEvent.update(getByTestId('agent-skill-reference-editor'), 'An unsaved edit');

		vi.mocked(api.getSkill).mockResolvedValue({
			...detail,
			skill: {
				...detail.skill,
				references: [{ path: 'references/tone.md', content: 'Warm and very short.' }],
			},
		});
		await rerender({ refreshKey: 1 });

		await waitFor(() =>
			expect(getByTestId('agent-skill-reference-editor')).toHaveValue('Warm and very short.'),
		);
		expect(store.fetchSkill).toHaveBeenCalledTimes(2);
		expect(getByRole('button', { name: 'Save skill' })).toBeDisabled();
	});

	it('shows an error when the skill cannot load', async () => {
		const { pinia } = setup();
		vi.mocked(api.getSkill).mockRejectedValue(new Error('Not found'));
		const { getByText } = renderComponent({ pinia });

		await waitFor(() => expect(getByText('Could not load the skill')).toBeInTheDocument());
	});
});
