import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';

import SkillSourcesTable from './SkillSourcesTable.vue';
import { sourceItem } from './skillUpdate.fixtures';

const render = createComponentRenderer(SkillSourcesTable);

describe('SkillSourcesTable', () => {
	beforeEach(() => {
		createTestingPinia({
			initialState: { [STORES.PROJECTS]: { personalProject: { id: 'personal-1' } } },
		});
	});

	it('shows each source with its scope, skills and updates', () => {
		const { getAllByTestId } = render({
			props: {
				sources: [
					sourceItem(),
					sourceItem({ id: 'src-2', label: 'acme/other', updatesAvailable: 2, updatesBlocked: 1 }),
				],
			},
		});

		const updates = getAllByTestId('skill-source-updates');
		expect(updates[0]).toHaveTextContent('Up to date');
		expect(updates[1]).toHaveTextContent('2 updates available');
		expect(updates[1]).toHaveTextContent('1 blocked');
		expect(getAllByTestId('skill-source-label').map((cell) => cell.textContent?.trim())).toEqual([
			'acme/skills',
			'acme/other',
		]);
	});

	it('says when there is no source yet', () => {
		const { getByTestId } = render({ props: { sources: [] } });

		expect(getByTestId('skill-sources-empty')).toHaveTextContent('No sources yet');
	});

	it('opens the updates of a source with updates on a row click, and not of one without', async () => {
		const withUpdates = sourceItem({ id: 'src-2', updatesAvailable: 1 });
		const { getAllByTestId, emitted } = render({
			props: { sources: [sourceItem(), withUpdates] },
		});

		await userEvent.click(getAllByTestId('skill-source-label')[0]);
		await userEvent.click(getAllByTestId('skill-source-label')[1]);

		expect(emitted('review')).toEqual([[withUpdates]]);
	});

	it('offers Review updates and Check now to a user who may review', async () => {
		const source = sourceItem({ updatesAvailable: 1 });
		const { getByTestId, emitted } = render({ props: { sources: [source] } });

		await userEvent.click(within(getByTestId('skill-source-actions')).getByRole('button'));
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-checkNow"]')).toBeInTheDocument(),
		);
		expect(document.querySelector('[data-test-id="action-review"]')).toBeInTheDocument();
		await userEvent.click(document.querySelector('[data-test-id="action-checkNow"]')!);

		expect(emitted('checkNow')).toEqual([[source]]);
	});

	it('offers only Open in GitHub to a user who cannot review', async () => {
		const { getByTestId } = render({
			props: { sources: [sourceItem({ updatesAvailable: 1, canReview: false })] },
		});

		await userEvent.click(within(getByTestId('skill-source-actions')).getByRole('button'));
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-openInGitHub"]')).toBeInTheDocument(),
		);
		expect(document.querySelector('[data-test-id="action-checkNow"]')).toBeNull();
		expect(document.querySelector('[data-test-id="action-review"]')).toBeNull();
	});
});
