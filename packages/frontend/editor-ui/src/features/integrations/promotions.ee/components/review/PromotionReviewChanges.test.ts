import type { PromotionReviewChanges as ReviewChanges } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { waitAllPromises } from '@/__tests__/utils';

import { billingPreview } from '../../__tests__/preview.fixtures';
import * as api from '../../promotions.api';
import PromotionReviewChanges from './PromotionReviewChanges.vue';

vi.mock('../../promotions.api');

const renderComponent = createComponentRenderer(PromotionReviewChanges);

const baselineCommitSha = 'a'.repeat(40);
const headCommitSha = 'b'.repeat(40);

const reviewChanges = (overrides: Partial<ReviewChanges> = {}): ReviewChanges => {
	const { resources, dependencies } = billingPreview();
	return {
		baselineCommitSha,
		headCommitSha,
		resources,
		dependencies,
		warnings: [],
		outcome: null,
		...overrides,
	};
};

async function render() {
	const result = renderComponent({
		pinia: createTestingPinia(),
		props: { reviewId: 'review-1' },
	});
	await waitAllPromises();
	return result;
}

const cardOf = (key: string, cards: HTMLElement[]) => {
	const card = cards.find((element) => element.dataset.resourceKey === key);
	if (!card) throw new Error(`No card for ${key}`);
	return card;
};

beforeEach(() => {
	vi.mocked(api.getPromotionReviewChanges).mockReset();
	vi.mocked(api.getPromotionReviewDetails).mockReset();
	vi.mocked(api.getPromotionReviewDetails).mockResolvedValue({ details: [], missingKeys: [] });
});

it('lists what the review changes, read-only, and reads each card at the commits of the list', async () => {
	vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(reviewChanges());
	vi.mocked(api.getPromotionReviewDetails).mockResolvedValue({
		details: [
			{
				key: 'variable:global:API_URL',
				type: 'variable',
				before: null,
				after: { name: 'API_URL', type: 'string', value: 'https://api.example.com' },
				revision: { before: null, after: 'API_URL-after' },
			},
		],
		missingKeys: [],
	});

	const { getAllByTestId, queryAllByRole, emitted } = await render();

	// Approve in the inbox sends this head.
	expect(emitted().state.at(-1)).toEqual([{ status: 'ready', headCommitSha }]);

	expect(api.getPromotionReviewDetails).toHaveBeenCalledWith(expect.anything(), 'review-1', {
		baselineCommitSha,
		headCommitSha,
		keys: expect.arrayContaining(['variable:global:API_URL', 'folder:f1', 'workflow:w1']),
	});
	// The review describes its own change, not this instance.
	expect(
		cardOf('variable:global:API_URL', getAllByTestId('promotion-preview-card')),
	).toHaveTextContent('Added in this review');
	expect(queryAllByRole('checkbox')).toEqual([]);
});

it('explains why the changes cannot be read and loads them again on retry', async () => {
	vi.mocked(api.getPromotionReviewChanges)
		.mockRejectedValueOnce(
			new ResponseError(
				'The remote no longer has the commits of this review. Open the review on the Git host.',
			),
		)
		.mockResolvedValueOnce(reviewChanges());

	const { getByTestId, getByRole, findAllByTestId } = await render();

	expect(getByTestId('promotion-review-error')).toHaveTextContent(
		'The remote no longer has the commits of this review.',
	);
	await userEvent.click(getByRole('button', { name: 'Try again' }));

	expect(await findAllByTestId('promotion-preview-card')).not.toHaveLength(0);
});

it('explains that the changes cannot be listed when a manifest cannot be read', async () => {
	vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(
		reviewChanges({ resources: [], dependencies: [], warnings: ['headManifestUnreadable'] }),
	);

	const { getByTestId, queryByTestId, emitted } = await render();

	// The admin saw no changes, so the inbox does not offer approve.
	expect(emitted().state.at(-1)).toEqual([{ status: 'unavailable' }]);
	expect(getByTestId('promotion-review-warning')).toHaveTextContent(
		"The package manifest in this review can't be read, so n8n can't list the changes.",
	);
	// An empty list here does not mean that the review changes nothing.
	expect(queryByTestId('promotion-review-empty')).not.toBeInTheDocument();
});

describe('when the host dropped the commits of a finished review', () => {
	const webUrl = 'https://gitlab.example.com/platform/workflows/-/merge_requests/3';
	const unavailable = (outcome: ReviewChanges['outcome']) =>
		reviewChanges({ resources: [], dependencies: [], warnings: ['commitsUnavailable'], outcome });

	it('states who merged the review and when, and opens it on the host', async () => {
		vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(
			unavailable({ state: 'merged', at: '2026-10-01T10:00:00.000Z', by: 'Ada Lovelace', webUrl }),
		);
		const open = vi.spyOn(window, 'open').mockImplementation(() => null);

		const { getByTestId, queryByTestId, getByRole, emitted } = await render();

		expect(emitted().state.at(-1)).toEqual([{ status: 'unavailable' }]);
		expect(getByTestId('promotion-review-outcome')).toHaveTextContent('This review was merged');
		expect(getByTestId('promotion-review-outcome')).toHaveTextContent(
			'Ada Lovelace merged this review on Oct 1',
		);
		expect(queryByTestId('promotion-review-warning')).not.toBeInTheDocument();
		expect(queryByTestId('promotion-review-empty')).not.toBeInTheDocument();

		await userEvent.click(getByRole('button', { name: 'View merge request' }));
		expect(open).toHaveBeenCalledWith(webUrl, '_blank', 'noopener,noreferrer');
	});

	it('shows the host user name as text, not as markup', async () => {
		vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(
			unavailable({ state: 'merged', at: null, by: 'Ada <b>Platform</b>', webUrl }),
		);

		const { getByTestId } = await render();

		expect(getByTestId('promotion-review-outcome')).toHaveTextContent(
			'Ada <b>Platform</b> merged this review.',
		);
		expect(getByTestId('promotion-review-outcome').querySelector('b')).toBeNull();
	});

	it('opens only an http or https review URL', async () => {
		vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(
			unavailable({ state: 'closed', at: null, by: null, webUrl: 'javascript:alert(1)' }),
		);
		const open = vi.spyOn(window, 'open').mockImplementation(() => null);

		const { getByRole } = await render();
		await userEvent.click(getByRole('button', { name: 'View merge request' }));

		expect(open).not.toHaveBeenCalled();
	});

	it('states when the review was closed without naming a user', async () => {
		vi.mocked(api.getPromotionReviewChanges).mockResolvedValue(
			unavailable({ state: 'closed', at: '2026-10-02T10:00:00.000Z', by: null, webUrl }),
		);

		const { getByTestId } = await render();

		expect(getByTestId('promotion-review-outcome')).toHaveTextContent('This review is now closed');
		expect(getByTestId('promotion-review-outcome')).toHaveTextContent(
			'This review was closed on Oct 2',
		);
	});
});
