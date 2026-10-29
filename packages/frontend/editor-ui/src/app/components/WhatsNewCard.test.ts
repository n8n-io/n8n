import { nextTick } from 'vue';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { WHATS_NEW_MODAL_KEY } from '@/app/constants';
import { useVersionsStore } from '@n8n/stores/versions.store';
import type { WhatsNewArticle } from '@n8n/rest-api-client/api/versions';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import WhatsNewCard from './WhatsNewCard.vue';

vi.mock('@n8n/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({ track }),
	};
});

const renderComponent = createComponentRenderer(WhatsNewCard);
const telemetry = useTelemetry();

let uiStore: MockedStore<typeof useUIStore>;
let versionsStore: MockedStore<typeof useVersionsStore>;

const makeArticle = (id: number, overrides: Partial<WhatsNewArticle> = {}): WhatsNewArticle => ({
	id,
	title: `Article ${id}`,
	content: `Summary of article ${id}.\n\nMore detail.`,
	createdAt: '2025-06-19T12:00:00.000Z',
	updatedAt: '2025-06-19T12:00:00.000Z',
	publishedAt: '2025-06-19T12:00:00.000Z',
	...overrides,
});

// jsdom has no layout, so the swipe threshold falls back to 40% of 200px.
const DISMISS_DISTANCE = 100;

async function drag(element: HTMLElement, dx: number, steps = 4) {
	await fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
	for (let step = 1; step <= steps; step++) {
		await fireEvent.pointerMove(window, {
			pointerId: 1,
			clientX: 100 + (dx * step) / steps,
			clientY: 100,
		});
	}
	await fireEvent.pointerUp(window, { pointerId: 1, clientX: 100 + dx, clientY: 100 });
}

describe('WhatsNewCard', () => {
	beforeEach(() => {
		createTestingPinia();
		uiStore = mockedStore(useUIStore);
		versionsStore = mockedStore(useVersionsStore);
		versionsStore.whatsNewCardArticles = [];
		vi.mocked(telemetry.track).mockClear();
	});

	it('renders nothing when there is no unread article', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('whats-new-card')).not.toBeInTheDocument();
	});

	it('shows only the title of the first article', () => {
		versionsStore.whatsNewCardArticles = [makeArticle(1)];

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('whats-new-card-title')).toHaveTextContent('Article 1');
		expect(getByTestId('whats-new-card')).not.toHaveTextContent('Summary of article 1');
		expect(getByTestId('whats-new-card-open')).toHaveAttribute(
			'aria-label',
			"What's new: Article 1",
		);
		expect(queryByTestId('whats-new-card-counter')).not.toBeInTheDocument();
		expect(queryByTestId('whats-new-card-image')).not.toBeInTheDocument();
	});

	it('uses the first image of the article when it has one', () => {
		versionsStore.whatsNewCardArticles = [
			makeArticle(1, { content: '![hero](https://cdn.example.com/hero.png)\n\nText.' }),
		];

		const { getByTestId } = renderComponent();

		expect(getByTestId('whats-new-card-image')).toHaveAttribute(
			'src',
			'https://cdn.example.com/hero.png',
		);
	});

	it('shows how many articles are stacked', () => {
		versionsStore.whatsNewCardArticles = [makeArticle(1), makeArticle(2), makeArticle(3)];

		const { getByTestId } = renderComponent();

		expect(getByTestId('whats-new-card-counter')).toHaveTextContent('1 of 3');
	});

	describe('stack', () => {
		it('renders up to two full cards behind the front one, out of reach of assistive tech', () => {
			versionsStore.whatsNewCardArticles = [1, 2, 3, 4].map((id) => makeArticle(id));

			const { getAllByTestId, getByTestId } = renderComponent();
			const backCards = getAllByTestId('whats-new-card-back');

			expect(backCards).toHaveLength(2);
			for (const card of backCards) {
				expect(card).toHaveAttribute('inert');
				expect(card).toHaveAttribute('aria-hidden', 'true');
				expect(card.querySelector('button')).toBeNull();
			}
			// Painted back to front, so the card behind the front one is directly before it.
			expect(backCards[1]).toHaveTextContent('Article 2');
			expect(backCards[1].nextElementSibling).toBe(getByTestId('whats-new-card-front'));
		});

		it('keeps the element of the next card when it moves to the front', async () => {
			versionsStore.whatsNewCardArticles = [makeArticle(7), makeArticle(8)];

			const { getByTestId, queryByTestId } = renderComponent();
			const next = getByTestId('whats-new-card-back');
			await userEvent.click(getByTestId('whats-new-card-dismiss'));
			versionsStore.whatsNewCardArticles = [makeArticle(8)];
			await nextTick();

			expect(getByTestId('whats-new-card-front')).toBe(next);
			expect(getByTestId('whats-new-card-title')).toHaveTextContent('Article 8');
			expect(queryByTestId('whats-new-card-back')).not.toBeInTheDocument();
		});
	});

	it("opens the what's new panel at the article when the card is clicked", async () => {
		versionsStore.whatsNewCardArticles = [makeArticle(7)];

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('whats-new-card-open'));

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: WHATS_NEW_MODAL_KEY,
			data: { articleId: 7 },
		});
		expect(telemetry.track).toHaveBeenCalledWith("User clicked on what's new notification", {
			article_id: 7,
			source: 'sidebar_card',
		});
	});

	it('marks the article read when the close button is clicked', async () => {
		versionsStore.whatsNewCardArticles = [makeArticle(7), makeArticle(8)];

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('whats-new-card-dismiss'));

		expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledWith(7);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.PLATFORM.USER_DISMISSED_WHATS_NEW_CARD,
			{ article_id: 7, method: 'button', remaining_count: 1 },
		);
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});

	it('marks the article read on Delete while the card is focused', async () => {
		versionsStore.whatsNewCardArticles = [makeArticle(7)];

		const { getByTestId } = renderComponent();
		getByTestId('whats-new-card-open').focus();
		await userEvent.keyboard('{Delete}');

		expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledWith(7);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.PLATFORM.USER_DISMISSED_WHATS_NEW_CARD,
			{ article_id: 7, method: 'keyboard', remaining_count: 0 },
		);
	});

	describe('swipe', () => {
		it('dismisses the card once it is dragged far enough sideways', async () => {
			versionsStore.whatsNewCardArticles = [makeArticle(7), makeArticle(8)];

			const { getByTestId } = renderComponent();
			await drag(getByTestId('whats-new-card-front'), DISMISS_DISTANCE + 20);

			expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledWith(7);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.PLATFORM.USER_DISMISSED_WHATS_NEW_CARD,
				{ article_id: 7, method: 'swipe', remaining_count: 1 },
			);
		});

		it('keeps the card when the drag stops short of the threshold', async () => {
			versionsStore.whatsNewCardArticles = [makeArticle(7)];

			const { getByTestId } = renderComponent();
			await drag(getByTestId('whats-new-card-front'), 30);

			expect(versionsStore.setWhatsNewArticleRead).not.toHaveBeenCalled();
			expect(getByTestId('whats-new-card-front')).not.toHaveAttribute('style');
		});

		it('does not open the article after a drag', async () => {
			versionsStore.whatsNewCardArticles = [makeArticle(7)];

			const { getByTestId } = renderComponent();
			const card = getByTestId('whats-new-card-front');
			await drag(card, 30);
			await fireEvent.click(getByTestId('whats-new-card-open'));

			expect(uiStore.openModalWithData).not.toHaveBeenCalled();

			// The next, separate click is a real one.
			await fireEvent.pointerDown(card, { button: 0, pointerId: 2, clientX: 100, clientY: 100 });
			await fireEvent.pointerUp(window, { pointerId: 2, clientX: 100, clientY: 100 });
			await fireEvent.click(getByTestId('whats-new-card-open'));

			expect(uiStore.openModalWithData).toHaveBeenCalledTimes(1);
		});

		it('does not start a drag from the close button', async () => {
			versionsStore.whatsNewCardArticles = [makeArticle(7)];

			const { getByTestId } = renderComponent();
			await drag(getByTestId('whats-new-card-dismiss'), DISMISS_DISTANCE + 20);

			expect(versionsStore.setWhatsNewArticleRead).not.toHaveBeenCalled();
		});

		it('dismisses the card on a horizontal trackpad swipe', async () => {
			versionsStore.whatsNewCardArticles = [makeArticle(7), makeArticle(8)];

			const { getByTestId } = renderComponent();
			const card = getByTestId('whats-new-card-front');
			await fireEvent.wheel(card, { deltaX: -60, deltaY: 2 });
			expect(versionsStore.setWhatsNewArticleRead).not.toHaveBeenCalled();

			await fireEvent.wheel(card, { deltaX: -60, deltaY: 0 });

			expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledWith(7);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.PLATFORM.USER_DISMISSED_WHATS_NEW_CARD,
				{ article_id: 7, method: 'swipe', remaining_count: 1 },
			);
		});

		it('ignores vertical wheel events so the sidebar can scroll', async () => {
			versionsStore.whatsNewCardArticles = [makeArticle(7)];

			const { getByTestId } = renderComponent();
			await fireEvent.wheel(getByTestId('whats-new-card-front'), { deltaX: 10, deltaY: 400 });

			expect(versionsStore.setWhatsNewArticleRead).not.toHaveBeenCalled();
		});

		it('lets the trackpad inertia run out before the next card can move', async () => {
			vi.useFakeTimers();
			versionsStore.whatsNewCardArticles = [makeArticle(7), makeArticle(8)];

			const { getByTestId } = renderComponent();
			await fireEvent.wheel(getByTestId('whats-new-card-front'), { deltaX: -120, deltaY: 0 });
			expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledTimes(1);

			// The next card is in place; the tail of the same gesture must not take it too.
			versionsStore.whatsNewCardArticles = [makeArticle(8)];
			await vi.advanceTimersByTimeAsync(0);
			await fireEvent.wheel(getByTestId('whats-new-card-front'), { deltaX: -120, deltaY: 0 });
			expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(200);
			await fireEvent.wheel(getByTestId('whats-new-card-front'), { deltaX: -120, deltaY: 0 });
			expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledTimes(2);
			vi.useRealTimers();
		});
	});
});
