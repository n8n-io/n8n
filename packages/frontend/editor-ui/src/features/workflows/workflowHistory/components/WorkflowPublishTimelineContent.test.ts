import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { registerToastNotifier } from '@/app/init/toastNotifier';
import WorkflowPublishTimelineContent from './WorkflowPublishTimelineContent.vue';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
import type { PublishTimelineEvent } from '@n8n/rest-api-client/api/workflowHistory';

const workflowId = 'wf-1';

const buildEvent = (overrides: Partial<PublishTimelineEvent> = {}): PublishTimelineEvent => ({
	id: 1,
	workflowId,
	versionId: 'v1',
	event: 'activated',
	createdAt: new Date().toISOString(),
	userId: null,
	user: null,
	versionName: null,
	...overrides,
});

const renderComponent = createComponentRenderer(WorkflowPublishTimelineContent);

type RenderOptions = {
	adoptionDate?: string | null;
};

const renderWithEvents = (events: PublishTimelineEvent[], options: RenderOptions = {}) => {
	const { adoptionDate = null } = options;
	const pinia = createTestingPinia({ stubActions: false });
	const workflowHistoryStore = mockedStore(useWorkflowHistoryStore);

	workflowHistoryStore.getPublishTimeline.mockResolvedValue(events);
	workflowHistoryStore.getVersionFirstAdoptionDate.mockResolvedValue(adoptionDate);

	const utils = renderComponent({
		pinia,
		props: { workflowId },
	});

	return { ...utils, workflowHistoryStore };
};

describe('WorkflowPublishTimelineContent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the empty state when there are no events', async () => {
		const { findByText } = renderWithEvents([]);

		expect(await findByText('This workflow has no publish history yet.')).toBeInTheDocument();
	});

	it('should call the store with the workflow id from props', async () => {
		const { findByText, workflowHistoryStore } = renderWithEvents([]);
		await findByText('This workflow has no publish history yet.');

		expect(workflowHistoryStore.getPublishTimeline).toHaveBeenCalledWith(workflowId, {
			take: 100,
			skip: 0,
		});
	});

	it('should render a published entry with its version name', async () => {
		const { findByText } = renderWithEvents([
			buildEvent({ event: 'activated', versionId: 'v1', versionName: 'Release 1' }),
		]);

		expect(await findByText('Published Release 1')).toBeInTheDocument();
	});

	it('should render a deactivated entry', async () => {
		const now = new Date();
		const { findByText, queryByText } = renderWithEvents([
			buildEvent({
				id: 1,
				event: 'activated',
				createdAt: new Date(now.getTime() - 10_000).toISOString(),
			}),
			buildEvent({
				id: 2,
				event: 'deactivated',
				createdAt: now.toISOString(),
			}),
		]);

		expect(await findByText('Unpublished')).toBeInTheDocument();
		// The activated entry before it should still be visible
		expect(queryByText('Published')).toBeInTheDocument();
	});

	it('should emit selectVersion when clicking a version link', async () => {
		const { findByText, emitted } = renderWithEvents([
			buildEvent({ versionId: 'v42', versionName: 'Release 42' }),
		]);

		const link = await findByText('Published Release 42');
		await userEvent.click(link);

		expect(emitted().selectVersion).toEqual([['v42']]);
	});

	it('should not render a version link when the version id is missing (deleted version)', async () => {
		const { findByText, queryByRole } = renderWithEvents([
			buildEvent({ versionId: '', versionName: null }),
		]);

		expect(await findByText('Published a version')).toBeInTheDocument();
		expect(queryByRole('link')).not.toBeInTheDocument();
	});

	it('should show the user attribution and datetime as a tooltip when an event has an associated user', async () => {
		const { findByText, findAllByText } = renderWithEvents([
			buildEvent({ user: { firstName: 'Alice', lastName: 'Anderson' } }),
		]);

		const trigger = await findByText('Published');
		await userEvent.hover(trigger);

		const matches = await findAllByText(/^Published by Alice Anderson, .+ at .+/);
		expect(matches.length).toBeGreaterThan(0);
	});

	it('should not show user attribution when no user is associated with the event', async () => {
		const { findByText, queryByText } = renderWithEvents([buildEvent({ user: null })]);

		const trigger = await findByText('Published');
		await userEvent.hover(trigger);
		expect(queryByText(/Alice Anderson/)).not.toBeInTheDocument();
	});

	it('should filter out a brief deactivation that lasted under the transient threshold', async () => {
		const activated = new Date('2026-03-01T10:00:00Z');
		const briefDeactivated = new Date(activated.getTime() + 60_000); // 1m later
		const reactivated = new Date(briefDeactivated.getTime() + 500); // 500ms gap

		const { findAllByText, queryByText } = renderWithEvents([
			buildEvent({ id: 1, event: 'activated', createdAt: activated.toISOString() }),
			buildEvent({ id: 2, event: 'deactivated', createdAt: briefDeactivated.toISOString() }),
			buildEvent({ id: 3, event: 'activated', createdAt: reactivated.toISOString() }),
		]);

		// Wait for render: two published entries remain after filtering the brief deactivation
		const published = await findAllByText('Published');
		expect(published).toHaveLength(2);
		expect(queryByText('Unpublished')).not.toBeInTheDocument();
	});

	it('should keep a long deactivation and render it as unpublished', async () => {
		const activated = new Date('2026-03-01T10:00:00Z');
		const deactivated = new Date(activated.getTime() + 60_000);
		const reactivated = new Date(deactivated.getTime() + 10_000); // 10s gap: above the 2s threshold

		const { findByText } = renderWithEvents([
			buildEvent({ id: 1, event: 'activated', createdAt: activated.toISOString() }),
			buildEvent({ id: 2, event: 'deactivated', createdAt: deactivated.toISOString() }),
			buildEvent({ id: 3, event: 'activated', createdAt: reactivated.toISOString() }),
		]);

		expect(await findByText('Unpublished')).toBeInTheDocument();
	});

	it('should show the deleted-versions disclaimer when an event predates the adoption date', async () => {
		const { findByText } = renderWithEvents(
			[
				buildEvent({
					id: 1,
					event: 'activated',
					createdAt: '2025-01-01T00:00:00Z',
				}),
			],
			{ adoptionDate: '2026-01-01T00:00:00Z' },
		);

		expect(await findByText(/History before .* may be incomplete/)).toBeInTheDocument();
	});

	it('should not show the deleted-versions disclaimer when every event is after the adoption date', async () => {
		const { queryByText, findByText } = renderWithEvents(
			[
				buildEvent({
					id: 1,
					event: 'activated',
					createdAt: '2026-06-01T00:00:00Z',
				}),
			],
			{ adoptionDate: '2026-01-01T00:00:00Z' },
		);

		await findByText('Published');
		expect(queryByText(/History before .* may be incomplete/)).not.toBeInTheDocument();
	});

	describe('date formatting', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			// Freeze "now" at a stable point so we can compare same-year vs. different-year rendering
			vi.setSystemTime(new Date('2026-04-22T10:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should render a same-year, non-today date without the year', async () => {
			const { findByText, queryByText } = renderWithEvents([
				buildEvent({ createdAt: '2026-01-15T12:00:00Z' }),
			]);

			expect(await findByText('15 Jan')).toBeInTheDocument();
			expect(queryByText(/15 Jan 2026/)).not.toBeInTheDocument();
		});

		it('should render a different-year date including the year', async () => {
			const { findByText } = renderWithEvents([buildEvent({ createdAt: '2025-11-03T12:00:00Z' })]);

			expect(await findByText('3 Nov 2025')).toBeInTheDocument();
		});
	});

	it('should tolerate a failure fetching the adoption date and still render events', async () => {
		const pinia = createTestingPinia({ stubActions: false });
		const workflowHistoryStore = mockedStore(useWorkflowHistoryStore);

		workflowHistoryStore.getPublishTimeline.mockResolvedValue([buildEvent()]);
		workflowHistoryStore.getVersionFirstAdoptionDate.mockRejectedValue(new Error('boom'));

		const { findByText } = renderComponent({ pinia, props: { workflowId } });

		expect(await findByText('Published')).toBeInTheDocument();
	});

	describe('paging', () => {
		let scrollToEnd = () => {};

		beforeEach(() => {
			scrollToEnd = () => {};
			vi.stubGlobal(
				'IntersectionObserver',
				class {
					isObserving = false;

					constructor(callback: IntersectionObserverCallback) {
						scrollToEnd = () => {
							if (!this.isObserving) return;
							callback(
								[{ isIntersecting: true } as IntersectionObserverEntry],
								this as unknown as IntersectionObserver,
							);
						};
					}

					observe = vi.fn(() => {
						this.isObserving = true;
					});

					disconnect = vi.fn(() => {
						this.isObserving = false;
					});

					unobserve = vi.fn();

					takeRecords = vi.fn();
				},
			);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		const buildPage = (count: number, firstId: number, newest: Date) =>
			Array.from({ length: count }, (_, i) =>
				buildEvent({
					id: firstId + i,
					createdAt: new Date(newest.getTime() - i * 60_000).toISOString(),
				}),
			);

		const renderWithPages = (...pages: PublishTimelineEvent[][]) => {
			const pinia = createTestingPinia({ stubActions: false });
			const workflowHistoryStore = mockedStore(useWorkflowHistoryStore);
			for (const page of pages) {
				workflowHistoryStore.getPublishTimeline.mockResolvedValueOnce(page);
			}
			workflowHistoryStore.getVersionFirstAdoptionDate.mockResolvedValue(null);

			return { ...renderComponent({ pinia, props: { workflowId } }), workflowHistoryStore };
		};

		it('should request the next page when the end of the list becomes visible', async () => {
			const newest = new Date('2026-03-01T10:00:00Z');
			const { findAllByText, getAllByText, workflowHistoryStore } = renderWithPages(
				buildPage(100, 1, newest),
				buildPage(1, 101, new Date(newest.getTime() - 100 * 60_000)),
			);
			expect(await findAllByText('Published')).toHaveLength(100);

			scrollToEnd();

			await waitFor(() => expect(workflowHistoryStore.getPublishTimeline).toHaveBeenCalledTimes(2));
			expect(workflowHistoryStore.getPublishTimeline).toHaveBeenLastCalledWith(workflowId, {
				take: 100,
				skip: 100,
			});
			await waitFor(() => expect(getAllByText('Published')).toHaveLength(101));
		});

		it('should remove overlapping events without shifting the offset or timestamp tie order', async () => {
			const events = Array.from({ length: 205 }, (_, i) =>
				buildEvent({
					id: 205 - i,
					versionName: `Version ${205 - i}`,
					createdAt: '2026-03-01T10:00:00Z',
				}),
			);
			const { findAllByText, getAllByText, workflowHistoryStore } = renderWithPages(
				events.slice(0, 100),
				events.slice(99, 199),
				events.slice(199),
			);
			expect(await findAllByText(/^Published Version /)).toHaveLength(100);

			scrollToEnd();
			await waitFor(() => expect(getAllByText(/^Published Version /)).toHaveLength(199));
			expect(getAllByText('Published Version 106')).toHaveLength(1);

			scrollToEnd();
			await waitFor(() => expect(getAllByText(/^Published Version /)).toHaveLength(205));

			expect(workflowHistoryStore.getPublishTimeline.mock.calls).toEqual([
				[workflowId, { take: 100, skip: 0 }],
				[workflowId, { take: 100, skip: 100 }],
				[workflowId, { take: 100, skip: 200 }],
			]);
			expect(getAllByText(/^Published Version /).map((element) => element.textContent)).toEqual(
				events.map(({ versionName }) => `Published ${versionName}`),
			);
		});

		it('should retry a failed page on the next scroll without advancing the offset', async () => {
			registerToastNotifier();
			const newest = new Date('2026-03-01T10:00:00Z');
			const { findByText, findAllByText, getAllByText, workflowHistoryStore } = renderWithPages(
				buildPage(100, 1, newest),
			);
			const error = new Error('Failed to load page');
			workflowHistoryStore.getPublishTimeline
				.mockRejectedValueOnce(error)
				.mockResolvedValueOnce(buildPage(1, 101, new Date(newest.getTime() - 100 * 60_000)));
			expect(await findAllByText('Published')).toHaveLength(100);

			scrollToEnd();
			expect(await findByText(error.message)).toBeInTheDocument();

			expect(workflowHistoryStore.getPublishTimeline).toHaveBeenCalledTimes(2);
			expect(getAllByText('Published')).toHaveLength(100);

			scrollToEnd();
			await waitFor(() => expect(getAllByText('Published')).toHaveLength(101));

			expect(workflowHistoryStore.getPublishTimeline).toHaveBeenCalledTimes(3);
			expect(workflowHistoryStore.getPublishTimeline.mock.calls.slice(1)).toEqual([
				[workflowId, { take: 100, skip: 100 }],
				[workflowId, { take: 100, skip: 100 }],
			]);
		});

		it('should not request another page after a page that is not full', async () => {
			const { findAllByText, workflowHistoryStore } = renderWithPages(
				buildPage(3, 1, new Date('2026-03-01T10:00:00Z')),
			);
			expect(await findAllByText('Published')).toHaveLength(3);

			scrollToEnd();

			expect(workflowHistoryStore.getPublishTimeline).toHaveBeenCalledTimes(1);
		});
	});
});
