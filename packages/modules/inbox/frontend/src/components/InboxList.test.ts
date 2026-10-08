import type { InboxSelfHealingItem, InboxWorkflowReviewItem } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useUsersStore } from '@n8n/stores/users.store';
import { fireEvent, within } from '@testing-library/vue';
import { useIntersectionObserver } from '@vueuse/core';

import InboxList from './InboxList.vue';
import type { InboxListSection } from './InboxListSection.vue';

vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal<typeof import('@vueuse/core')>()),
	useIntersectionObserver: vi.fn(),
}));

function section(
	key: InboxListSection['key'],
	props: Partial<InboxListSection> = {},
): InboxListSection {
	return {
		key,
		items: [],
		loading: false,
		loadingMore: false,
		hasMore: false,
		error: null,
		partial: false,
		...props,
	};
}
function result(props: Partial<InboxSelfHealingItem> = {}): InboxSelfHealingItem {
	return {
		type: 'self_healing_result',
		id: 'result',
		state: 'open',
		projectId: 'project',
		workflowId: 'workflow',
		workflowName: 'My workflow',
		summary: 'Fix the workflow',
		outcome: 'fix_ready',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		completedAt: '2026-01-01T00:00:00.000Z',
		...props,
	};
}
function review(): InboxWorkflowReviewItem {
	return {
		type: 'workflow_review',
		id: 'review',
		state: 'open',
		decision: 'pending',
		projectId: 'project',
		title: 'Review my workflow',
		workflowName: 'My workflow',
		workflowVersionId: null,
		requester: null,
		authors: [],
		reviewers: [],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	};
}
const renderComponent = createComponentRenderer(InboxList, {
	props: {
		sections: [section('waiting'), section('authored')],
		activeTab: 'open',
		selectedKey: null,
		openCount: null,
		closedCount: null,
	},
});
beforeEach(() => localStorage.clear());
function intersect(isIntersecting = true) {
	const onIntersect = vi.mocked(useIntersectionObserver).mock.calls.at(-1)![1];
	onIntersect([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
}

it('shows one initial skeleton without empty group headers', () => {
	const { getAllByTestId, queryByTestId } = renderComponent({
		props: {
			sections: [section('waiting', { loading: true }), section('authored', { loading: true })],
		},
	});
	expect(getAllByTestId('inbox-list-skeleton')).toHaveLength(1);
	expect(queryByTestId('inbox-section-header')).not.toBeInTheDocument();
});
it('offers one retry when the first load fails without rows', () => {
	const { getAllByRole, queryByTestId, emitted } = renderComponent({
		props: {
			sections: [
				section('waiting', { error: new Error('Request failed') }),
				section('authored', { error: new Error('Request failed') }),
			],
		},
	});
	const buttons = getAllByRole('button', { name: 'Retry' });
	expect(buttons).toHaveLength(1);
	buttons[0].click();
	expect(emitted('retryActiveTab')).toEqual([[]]);
	expect(queryByTestId('inbox-section-header')).not.toBeInTheDocument();
});
it('hides healthy empty groups without hiding a failed group or healthy rows', () => {
	const { queryByRole, getByRole, emitted } = renderComponent({
		props: {
			sections: [
				section('waiting', { items: [result()] }),
				section('authored', { error: new Error('Request failed') }),
			],
		},
	});
	expect(getByRole('option')).toHaveTextContent('Fix the workflow');
	getByRole('button', { name: 'Retry' }).click();
	expect(emitted('retry')).toEqual([['authored']]);
	expect(queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
});
it('hides settled empty group headers', () => {
	const { queryByTestId } = renderComponent();
	expect(queryByTestId('inbox-section-header')).not.toBeInTheDocument();
});
it('keeps a partial empty group visible with its own retry', () => {
	const { getByRole, emitted } = renderComponent({
		props: { sections: [section('waiting', { partial: true }), section('authored')] },
	});
	expect(getByRole('button', { name: 'Waiting for your review' })).toBeInTheDocument();
	getByRole('button', { name: 'Retry' }).click();
	expect(emitted('refreshSection')).toEqual([['waiting']]);
});
it('collapses groups without requesting more data', async () => {
	const { getByRole, queryByRole, emitted } = renderComponent({
		props: { sections: [section('waiting', { items: [result()] })] },
	});
	const header = getByRole('button', { name: 'Waiting for your review' });
	await fireEvent.click(header);
	expect(header).toHaveAttribute('aria-expanded', 'false');
	expect(queryByRole('option')).not.toBeInTheDocument();
	await fireEvent.click(header);
	expect(getByRole('option')).toHaveTextContent('Fix the workflow');
	expect(emitted('loadMore')).toBeUndefined();
});
it('uses the impersonal waiting label for administrators', () => {
	vi.spyOn(useUsersStore(), 'isAdminOrOwner', 'get').mockReturnValue(true);
	const { getByRole } = renderComponent({
		props: { sections: [section('waiting', { items: [review()] })] },
	});
	expect(getByRole('button', { name: 'Waiting for review' })).toBeInTheDocument();
});
it('keeps loading open groups explicit and identifies the group', () => {
	const { emitted, getByRole } = renderComponent({
		props: { sections: [section('authored', { hasMore: true })] },
	});
	intersect();
	expect(emitted('loadMore')).toBeUndefined();
	getByRole('button', { name: 'Load more' }).click();
	expect(emitted('loadMore')).toEqual([['authored']]);
});
it('loads Closed at the bottom without group headers or a Load more button', () => {
	const { emitted, queryByRole, queryByTestId } = renderComponent({
		props: { activeTab: 'closed', sections: [section('closed', { hasMore: true })] },
	});
	intersect(false);
	expect(emitted('loadMore')).toBeUndefined();
	intersect();
	expect(emitted('loadMore')).toEqual([['closed']]);
	expect(queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
	expect(queryByTestId('inbox-section-header')).not.toBeInTheDocument();
});
it.each([
	{ loading: true },
	{ loadingMore: true },
	{ hasMore: false },
	{ error: new Error('Request failed') },
])('does not automatically load Closed with %o', (props) => {
	const { emitted } = renderComponent({
		props: { activeTab: 'closed', sections: [section('closed', { hasMore: true, ...props })] },
	});
	intersect();
	expect(emitted('loadMore')).toBeUndefined();
});
it('rearms the Closed sentinel after loading and removes it on Open', async () => {
	const { rerender, emitted } = renderComponent({
		props: { activeTab: 'closed', sections: [section('closed', { hasMore: true })] },
	});
	const target = vi.mocked(useIntersectionObserver).mock.calls.at(-1)![0];
	expect(target).not.toHaveProperty('value', null);
	intersect();
	await rerender({ sections: [section('closed', { hasMore: true, loadingMore: true })] });
	expect(target).toHaveProperty('value', null);
	intersect();
	expect(emitted('loadMore')).toHaveLength(1);
	await rerender({ sections: [section('closed', { hasMore: true })] });
	expect(target).not.toHaveProperty('value', null);
	intersect();
	expect(emitted('loadMore')).toHaveLength(2);
	await rerender({ activeTab: 'open', sections: [section('waiting')] });
	expect(target).toHaveProperty('value', null);
});
it('renders compact rows with an Assistant avatar and no source subtitle', () => {
	const { getAllByRole, queryByText } = renderComponent({
		props: { sections: [section('waiting', { items: [result(), review()] })] },
	});
	const [assistantRow, reviewRow] = getAllByRole('option');
	expect(within(assistantRow).getByTestId('inbox-assistant-avatar')).toBeInTheDocument();
	expect(within(reviewRow).queryByTestId('inbox-assistant-avatar')).not.toBeInTheDocument();
	expect(within(assistantRow).getByText('My workflow')).toBeInTheDocument();
	expect(queryByText('Workflow review')).not.toBeInTheDocument();
	expect(queryByText('Fix ready')).not.toBeInTheDocument();
});
it.each([
	['fix_ready', 'open', 'Open | Fix ready', 'fixReady'],
	['needs_you', 'open', 'Open | Needs attention', 'needsAttention'],
	['could_not_fix', 'open', 'Open | Could not fix', 'needsAttention'],
	['fix_ready', 'closed', 'Closed | Fix ready', 'closed'],
] as const)(
	'labels Assistant %s/%s without implying review approval',
	(outcome, state, label, color) => {
		const { getByRole } = renderComponent({
			props: { sections: [section('waiting', { items: [result({ outcome, state })] })] },
		});
		const dot = getByRole('img', { name: label });
		expect(dot.className).toContain(color);
		expect(dot).not.toHaveAccessibleName(/approved/i);
	},
);

it('separates partial-source recovery from a failed page retry', () => {
	const { getByTestId, emitted } = renderComponent({
		props: { sections: [section('waiting', { partial: true, error: new Error('Page failed') })] },
	});
	within(getByTestId('inbox-partial')).getByRole('button', { name: 'Retry' }).click();
	expect(emitted('refreshSection')).toEqual([['waiting']]);
	expect(emitted('retry')).toBeUndefined();
	within(getByTestId('inbox-list-error')).getByRole('button', { name: 'Retry' }).click();
	expect(emitted('retry')).toEqual([['waiting']]);
});
