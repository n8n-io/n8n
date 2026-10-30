import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { ResponseError } from '@n8n/rest-api-client';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import SkillUpdateReviewDialog from './SkillUpdateReviewDialog.vue';
import { updateReview } from './skillUpdate.fixtures';
import { useSkillsStore } from '../skills.store';

const showErrorMock = vi.fn();
const showMessageMock = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: showMessageMock }),
}));

// N8nDialog teleports out of the tree, so a pass-through keeps it inline.
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

const render = createComponentRenderer(SkillUpdateReviewDialog);

describe('SkillUpdateReviewDialog', () => {
	let skillsStore: MockedStore<typeof useSkillsStore>;

	beforeEach(() => {
		createTestingPinia();
		skillsStore = mockedStore(useSkillsStore);
		showErrorMock.mockClear();
		showMessageMock.mockClear();
	});

	const open = async (review = updateReview()) => {
		skillsStore.fetchSkillUpdate.mockResolvedValue(review);
		const view = render({ props: { open: true, skillId: 'skill-1' } });
		await waitFor(() => expect(view.getByTestId('skill-update-check')).toBeInTheDocument());
		return view;
	};

	it('shows the diff, the commit, the check and what happens next', async () => {
		const { getByTestId, getByText } = await open();

		expect(getByTestId('dialog-title')).toHaveTextContent('brand-voice');
		expect(
			getByText(
				'Synced from acme/skills · skills/brand-voice. Edit it in GitHub; updates arrive here as reviews.',
			),
		).toBeInTheDocument();
		expect(getByTestId('skill-update-files')).toHaveTextContent('SKILL.md');
		expect(getByTestId('skill-update-files')).toHaveTextContent('references/tone.md');
		expect(getByTestId('skill-update-diff')).toHaveTextContent('Prefer active voice.');
		const commit = getByTestId('skill-update-commit');
		expect(commit).toHaveTextContent('Latest commit');
		expect(commit).toHaveTextContent('a91c0e2');
		expect(commit).toHaveTextContent('brand-voice: add tone examples');
		expect(commit).toHaveTextContent('lena');
		expect(commit).toHaveTextContent('f02b1aa…a91c0e2 (2 commits)');
		expect(getByTestId('skill-update-check')).toHaveTextContent('Security check: passed.');
		const next = getByTestId('skill-update-next');
		expect(next).toHaveTextContent('The skill becomes v3.');
		expect(next).toHaveTextContent('2 following agents get unpublished changes.');
		expect(next).toHaveTextContent(
			'Published agents do not change until they are published again.',
		);
		expect(getByTestId('skill-update-accept')).toHaveTextContent('Accept as v3');
	});

	it('says that no agent follows the skill, and leaves out published agents when none', async () => {
		const { getByTestId } = await open(
			updateReview({ impact: { nextVersion: 2, followingAgents: 0, publishedAgents: 0 } }),
		);

		expect(getByTestId('skill-update-next')).toHaveTextContent('No agent follows this skill.');
		expect(getByTestId('skill-update-next')).not.toHaveTextContent('Published agents');
	});

	it('accepts exactly the reviewed update', async () => {
		skillsStore.acceptSkillUpdate.mockResolvedValue({
			skillId: 'skill-1',
			name: 'brand-voice',
			version: 3,
		});
		const { getByTestId, emitted } = await open();

		await userEvent.click(getByTestId('skill-update-accept'));

		expect(skillsStore.acceptSkillUpdate).toHaveBeenCalledWith('skill-1', {
			contentHash: 'hash-1',
			reviewedWarnings: false,
		});
		expect(showMessageMock).toHaveBeenCalledWith({
			title: 'Accepted. brand-voice is now v3.',
			type: 'success',
		});
		expect(emitted('changed')).toHaveLength(1);
		expect(emitted('update:open')).toEqual([[false]]);
	});

	it('needs "I reviewed the warnings" for an update that needs review', async () => {
		skillsStore.acceptSkillUpdate.mockResolvedValue({
			skillId: 'skill-1',
			name: 'brand-voice',
			version: 3,
		});
		const { getByTestId, getByRole } = await open(
			updateReview({
				check: {
					verdict: 'needs_review',
					findings: [
						{
							rule: 'new_url',
							severity: 'needs_review',
							file: 'SKILL.md',
							detail: 'x',
							domain: 'dash.example.com',
						},
					],
				},
			}),
		);

		expect(getByTestId('skill-update-check')).toHaveTextContent('Security check: review.');
		expect(getByTestId('skill-update-accept')).toBeDisabled();
		await userEvent.click(getByRole('checkbox', { name: 'I reviewed the warnings' }));
		await userEvent.click(getByTestId('skill-update-accept'));

		expect(skillsStore.acceptSkillUpdate).toHaveBeenCalledWith('skill-1', {
			contentHash: 'hash-1',
			reviewedWarnings: true,
		});
	});

	it('offers no Accept and no "What happens next" for a blocked update', async () => {
		const { getByTestId, queryByTestId } = await open(
			updateReview({
				check: {
					verdict: 'blocked',
					findings: [
						{ rule: 'hidden_unicode', severity: 'blocked', file: 'SKILL.md', detail: 'x' },
					],
				},
			}),
		);

		expect(getByTestId('skill-update-check')).toHaveTextContent(
			'Nobody can accept this update. Fix it in GitHub. The next commit arrives as a new update.',
		);
		expect(queryByTestId('skill-update-accept')).toBeNull();
		expect(queryByTestId('skill-update-next')).toBeNull();
		expect(getByTestId('skill-update-skip')).toBeEnabled();
	});

	it('shows no diff for an update whose SKILL.md n8n cannot read', async () => {
		const { getByTestId, queryByTestId } = await open(
			updateReview({ update: null, check: { verdict: 'blocked', findings: [] } }),
		);

		expect(getByTestId('skill-update-unreadable')).toBeInTheDocument();
		expect(queryByTestId('skill-update-diff')).toBeNull();
	});

	it('names an upstream rename that clashes and disables Accept', async () => {
		const { getByTestId } = await open(updateReview({ nameClash: { name: 'release-notes' } }));

		expect(getByTestId('skill-update-name-clash')).toHaveTextContent(
			'GitHub renamed this skill to release-notes, and Marketing already has a skill with that name. Rename the other skill, or stop syncing this one.',
		);
		expect(getByTestId('skill-update-accept')).toBeDisabled();
	});

	it('skips the update', async () => {
		skillsStore.skipSkillUpdate.mockResolvedValue(undefined);
		const { getByTestId, emitted } = await open();

		await userEvent.click(getByTestId('skill-update-skip'));

		expect(skillsStore.skipSkillUpdate).toHaveBeenCalledWith('skill-1', { contentHash: 'hash-1' });
		expect(showMessageMock).toHaveBeenCalledWith({
			title: 'Skipped. The next change in GitHub arrives as a new update.',
			type: 'success',
		});
		expect(emitted('changed')).toHaveLength(1);
	});

	it('changes nothing on Later', async () => {
		const { getByTestId, emitted } = await open();

		await userEvent.click(getByTestId('skill-update-later'));

		expect(skillsStore.acceptSkillUpdate).not.toHaveBeenCalled();
		expect(skillsStore.skipSkillUpdate).not.toHaveBeenCalled();
		expect(showMessageMock).not.toHaveBeenCalled();
		expect(emitted('update:open')).toEqual([[false]]);
	});

	it('shows the text of a stale review and loads the latest change', async () => {
		skillsStore.acceptSkillUpdate.mockRejectedValue(
			new ResponseError('Server text', { meta: { reason: 'stale' } }),
		);
		const { getByTestId } = await open();

		await userEvent.click(getByTestId('skill-update-accept'));

		expect(showErrorMock).toHaveBeenCalledWith(
			new Error('This update changed since you opened it. Review the latest change.'),
			'Could not accept the update',
		);
		expect(skillsStore.fetchSkillUpdate).toHaveBeenCalledTimes(2);
	});

	it.each([
		{ projectId: null, text: 'Only admins review updates to Global skills.' },
		{
			projectId: 'team-1',
			text: 'Only members who can edit skills in Marketing review this update.',
		},
	])('is read-only for a user who cannot review ($text)', async ({ projectId, text }) => {
		const { getByTestId, queryByTestId } = await open(
			updateReview(
				{},
				{ canReview: false, projectId, projectName: projectId ? 'Marketing' : null },
			),
		);

		expect(getByTestId('skill-update-read-only')).toHaveTextContent(text);
		expect(queryByTestId('skill-update-accept')).toBeNull();
		expect(queryByTestId('skill-update-skip')).toBeNull();
		expect(getByTestId('skill-update-done')).toBeInTheDocument();
	});
});
