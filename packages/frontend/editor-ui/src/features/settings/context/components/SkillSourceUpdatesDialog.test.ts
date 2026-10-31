import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import SkillSourceUpdatesDialog from './SkillSourceUpdatesDialog.vue';
import { pendingUpdate, sourceItem, sourceUpdates } from './skillUpdate.fixtures';
import { useSkillsStore } from '../skills.store';

const showErrorMock = vi.fn();
const showMessageMock = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: showMessageMock }),
}));

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const N8nDialog = {
		name: 'N8nDialog',
		props: ['open', 'size', 'header'],
		emits: ['update:open'],
		template: `<div v-if="open" role="dialog"><h2 data-test-id="dialog-title">{{ header }}</h2><slot /></div>`,
	};
	return { ...actual, N8nDialog };
});

const render = createComponentRenderer(SkillSourceUpdatesDialog);

const REVIEW = { verdict: 'needs_review' as const, findings: [] };
const BLOCKED = { verdict: 'blocked' as const, findings: [] };

describe('SkillSourceUpdatesDialog', () => {
	let skillsStore: MockedStore<typeof useSkillsStore>;

	beforeEach(() => {
		createTestingPinia({
			initialState: { [STORES.PROJECTS]: { personalProject: { id: 'personal-1' } } },
		});
		skillsStore = mockedStore(useSkillsStore);
		showErrorMock.mockClear();
		showMessageMock.mockClear();
	});

	const open = async (data = sourceUpdates()) => {
		skillsStore.fetchSourceUpdates.mockResolvedValue(data);
		const view = render({ props: { open: true, sourceId: 'src-1' } });
		await waitFor(() => expect(view.getByTestId('dialog-title')).toHaveTextContent('acme/skills'));
		return view;
	};

	it('lists each update with its commit, tag and line counts', async () => {
		const { getAllByTestId, getByTestId, getByText } = await open(
			sourceUpdates({
				updates: [
					pendingUpdate(),
					pendingUpdate({ skillId: 'skill-2', name: 'campaign-brief', check: REVIEW }),
					pendingUpdate({ skillId: 'skill-3', name: 'sql-explorer', check: BLOCKED }),
				],
			}),
		);

		expect(getByTestId('dialog-title')).toHaveTextContent('Updates from acme/skills');
		expect(
			getByText(
				'Review each change, or update everything at once. Nothing changes until you accept.',
			),
		).toBeInTheDocument();
		const rows = getAllByTestId('skill-source-update-row');
		expect(rows).toHaveLength(3);
		expect(rows[0]).toHaveTextContent('brand-voice');
		expect(rows[0]).toHaveTextContent('skills/brand-voice');
		expect(getByTestId('skill-source-updates-commit')).toHaveTextContent(
			'Latest commit: brand-voice: add tone examples · lena',
		);
		expect(rows[0]).toHaveTextContent('+3');
		expect(rows[0]).not.toHaveTextContent('−0');
		expect(rows[1]).toHaveTextContent('Needs review');
		expect(rows[2]).toHaveTextContent('Blocked');
		// Blocked updates do not count.
		expect(getByTestId('skill-source-updates-update-all')).toHaveTextContent('Update all (2)');
	});

	it('needs "I reviewed the warnings" before Update all when an update needs review', async () => {
		skillsStore.acceptSourceUpdates.mockResolvedValue({ accepted: [], failed: [] });
		const { getByTestId, getByRole } = await open(
			sourceUpdates({ updates: [pendingUpdate({ check: REVIEW })] }),
		);

		expect(getByTestId('skill-source-updates-update-all')).toBeDisabled();
		await userEvent.click(getByRole('checkbox', { name: 'I reviewed the warnings' }));
		await userEvent.click(getByTestId('skill-source-updates-update-all'));

		expect(skillsStore.acceptSourceUpdates).toHaveBeenCalledWith('src-1', {
			updates: [{ skillId: 'skill-1', contentHash: 'hash-1' }],
			reviewedWarnings: true,
		});
	});

	it('updates every update that is not blocked, and says which did not come in', async () => {
		skillsStore.acceptSourceUpdates.mockResolvedValue({
			accepted: [{ skillId: 'skill-1', name: 'brand-voice', version: 3 }],
			failed: [{ skillId: 'skill-2', reason: 'name_clash' }],
		});
		const { getByTestId, emitted } = await open(
			sourceUpdates({
				updates: [
					pendingUpdate(),
					pendingUpdate({ skillId: 'skill-2', name: 'campaign-brief', contentHash: 'hash-2' }),
					pendingUpdate({ skillId: 'skill-3', name: 'sql-explorer', check: BLOCKED }),
				],
			}),
		);

		await userEvent.click(getByTestId('skill-source-updates-update-all'));

		expect(skillsStore.acceptSourceUpdates).toHaveBeenCalledWith('src-1', {
			updates: [
				{ skillId: 'skill-1', contentHash: 'hash-1' },
				{ skillId: 'skill-2', contentHash: 'hash-2' },
			],
			reviewedWarnings: false,
		});
		expect(showMessageMock).toHaveBeenCalledWith({
			title: 'Updated 1 skill. Following agents got unpublished changes.',
			type: 'success',
		});
		expect(showMessageMock).toHaveBeenCalledWith({
			title: '1 skill did not update: campaign-brief.',
			message: 'The source renamed this skill to a name that is already taken.',
			type: 'warning',
		});
		expect(emitted('changed')).toHaveLength(1);
	});

	it('leaves an update with a name clash out of Update all', async () => {
		const { getByTestId } = await open(
			sourceUpdates({
				updates: [
					pendingUpdate(),
					pendingUpdate({
						skillId: 'skill-2',
						name: 'campaign-brief',
						nameClash: { name: 'brand-voice', where: 'scope' },
					}),
				],
			}),
		);

		expect(getByTestId('skill-source-updates-update-all')).toHaveTextContent('Update all (1)');
	});

	it('counts a change to the frontmatter in the line counts', async () => {
		const { getAllByTestId } = await open(
			sourceUpdates({
				updates: [
					pendingUpdate({
						update: pendingUpdate().current,
						currentFrontmatter: { license: 'MIT' },
						updateFrontmatter: { license: 'Apache-2.0' },
					}),
				],
			}),
		);

		expect(getAllByTestId('skill-source-update-row')[0]).toHaveTextContent('+1');
	});

	it('opens the review of one update from the keyboard', async () => {
		const { getAllByTestId, emitted } = await open();

		getAllByTestId('skill-source-update-row')[0].focus();
		await userEvent.keyboard('{Enter}');

		expect(emitted('review')).toEqual([['skill-1', 'brand-voice']]);
	});

	it('opens the review of one update', async () => {
		const { getAllByTestId, emitted } = await open();

		await userEvent.click(getAllByTestId('skill-source-update-row')[0]);

		expect(emitted('review')).toEqual([['skill-1', 'brand-voice']]);
	});

	it('shows the title and a loading state while the updates load', async () => {
		skillsStore.fetchSourceUpdates.mockReturnValue(new Promise(() => {}));
		const { getByTestId } = render({
			props: { open: true, sourceId: 'src-1', label: 'acme/skills' },
		});

		expect(getByTestId('dialog-title')).toHaveTextContent('Updates from acme/skills');
		expect(getByTestId('skill-source-updates-loading')).toBeInTheDocument();
	});

	it('changes nothing on Later', async () => {
		const { getByTestId, emitted } = await open();

		await userEvent.click(getByTestId('skill-source-updates-later'));

		expect(skillsStore.acceptSourceUpdates).not.toHaveBeenCalled();
		expect(emitted('update:open')).toEqual([[false]]);
	});

	it('is read-only on a Global source for a user who is not an admin', async () => {
		const { getByTestId, queryByTestId } = await open(
			sourceUpdates({ source: sourceItem({ projectId: null, canReview: false }) }),
		);

		expect(getByTestId('skill-source-updates-read-only')).toHaveTextContent(
			'Only admins review updates to Global sources. Your agents keep the current version until then.',
		);
		expect(queryByTestId('skill-source-updates-update-all')).toBeNull();
		expect(getByTestId('skill-source-updates-done')).toBeInTheDocument();
	});
});
