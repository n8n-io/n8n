import type { SelfHealingResultDetail, SelfHealingResultWorkflow } from '@n8n/api-types';
import { VIEWS } from '@n8n/frontend-constants/views';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent, within } from '@testing-library/vue';
import { defineComponent, nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import SelfHealingResultChanges from './SelfHealingResultChanges.vue';
import { suggestion } from './selfHealingResults.test.utils';

const DiffView = defineComponent({
	props: {
		workflowId: String,
		workflowName: String,
		canvasIdPrefix: String,
		hideTitle: Boolean,
		requireCanvasFocus: Boolean,
	},
	template:
		'<div data-test-id="saved-workflow-diff" :data-workflow-id="workflowId" :data-canvas-id-prefix="canvasIdPrefix" :data-hide-title="hideTitle" :data-require-canvas-focus="requireCanvasFocus">{{ workflowName }}</div>',
});

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/workflow/:workflowId', name: VIEWS.WORKFLOW, component: { template: '<div />' } },
	],
});
const renderComponent = createComponentRenderer(SelfHealingResultChanges, {
	global: { plugins: [router], stubs: { RouterLink: false } },
});

const suggestions = [
	suggestion(),
	suggestion({ suggestionId: 'suggestion-2', workflowId: 'child-1' }),
	suggestion({ suggestionId: 'suggestion-3', workflowId: 'child-2' }),
];
const workflowNames = new Map([
	['workflow-1', 'Daily report'],
	['child-1', 'Send email'],
	['child-2', 'Write log'],
	['middle', 'Check order'],
]);
const listed = (workflowId: string, suggestionId: string | null = null) =>
	({
		workflowId,
		name: `Listed ${workflowId}`,
		change: suggestionId ? 'modified' : 'unchanged',
		suggestionId,
	}) satisfies SelfHealingResultWorkflow;
const call = (callerWorkflowId: string, calledWorkflowId: string) => ({
	callerWorkflowId,
	calledWorkflowId,
});

type ChangesDetail = Pick<
	SelfHealingResultDetail,
	'workflowId' | 'workflows' | 'calls' | 'suggestions'
>;

async function renderChanges(detail: Partial<ChangesDetail> = {}, projectName?: string) {
	const view = renderComponent({
		props: {
			detail: {
				workflowId: 'workflow-1',
				suggestions,
				workflows: [
					listed('workflow-1', 'suggestion-1'),
					listed('child-1', 'suggestion-2'),
					listed('child-2', 'suggestion-3'),
				],
				calls: [call('workflow-1', 'child-1'), call('workflow-1', 'child-2')],
				...detail,
			},
			workflowNames,
			projectName,
		},
	});
	await nextTick();
	return view;
}

function navItems(view: Awaited<ReturnType<typeof renderChanges>>) {
	return view.getAllByTestId('self-healing-changes-nav-item').map((item) => ({
		name: item.getAttribute('title'),
		unchanged: within(item).queryByText('Unchanged') !== null,
		indent: item.style.getPropertyValue('--changes-tree--indent'),
	}));
}

function activeNames(view: Awaited<ReturnType<typeof renderChanges>>) {
	return view
		.getAllByTestId('self-healing-changes-nav-item')
		.filter((item) => item.getAttribute('aria-current') === 'true')
		.map((item) => item.textContent?.trim());
}

function scrolledCard() {
	return vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1);
}

beforeEach(() => {
	componentRegistry.register('workflow-diff', DiffView);
	Element.prototype.scrollIntoView = vi.fn();
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(private readonly onIntersect: IntersectionObserverCallback) {}
			observe(target: Element) {
				this.onIntersect(
					[{ target, isIntersecting: true }] as unknown as IntersectionObserverEntry[],
					this as unknown as IntersectionObserver,
				);
			}
			disconnect() {}
		},
	);
});
afterEach(() => {
	componentRegistry.clear();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

it('shows one workflow without the navigation, with its diff in the same card layout', async () => {
	const view = await renderChanges(
		{
			suggestions: [suggestion()],
			workflows: [listed('workflow-1', 'suggestion-1')],
			calls: [],
		},
		'Operations',
	);

	expect(view.queryByRole('navigation')).not.toBeInTheDocument();
	expect(view.queryByTestId('self-healing-changes-nav-item')).not.toBeInTheDocument();
	const card = within(view.getByTestId('self-healing-changes-card'));
	expect(
		card.getByRole('heading', { level: 3, name: 'Daily report Failing workflow' }),
	).toBeInTheDocument();
	expect(card.getByRole('link', { name: 'Open Daily report' })).toHaveAttribute(
		'href',
		'/workflow/workflow-1',
	);
	expect(card.getByTestId('saved-workflow-diff')).toHaveAttribute('data-hide-title', 'true');
	expect(card.getByTestId('saved-workflow-diff')).toHaveAttribute(
		'data-require-canvas-focus',
		'false',
	);
	expect(card.queryByRole('button')).not.toBeInTheDocument();
});

it('lists every changed workflow, the failing workflow first, with one diff each', async () => {
	const view = await renderChanges();
	const nav = within(view.getByRole('navigation', { name: 'Workflows in this fix' }));

	expect(nav.getAllByRole('listitem').map((item) => item.textContent?.trim())).toEqual([
		'Daily report',
		'Send email',
		'Write log',
	]);
	expect(navItems(view).map(({ indent }) => indent)).toEqual(['0', '1', '1']);
	expect(
		view
			.getAllByTestId('self-healing-changes-card')
			.map((card) => within(card).getByTestId('self-healing-changes-card-toggle').textContent),
	).toEqual([
		expect.stringMatching(/Daily report\s*Failing workflow/),
		expect.stringMatching(/Send email\s*Sub-workflow/),
		expect.stringMatching(/Write log\s*Sub-workflow/),
	]);
	const diffs = view.getAllByTestId('saved-workflow-diff');
	expect(diffs.map((diff) => diff.dataset.workflowId)).toEqual([
		'workflow-1',
		'child-1',
		'child-2',
	]);
	expect(diffs.map((diff) => diff.dataset.canvasIdPrefix)).toEqual([
		'suggestion-1',
		'suggestion-2',
		'suggestion-3',
	]);
	expect(diffs[0]).toHaveAttribute('data-hide-title', 'true');
	expect(diffs[0]).toHaveAttribute('data-require-canvas-focus', 'true');
	const secondCard = within(view.getAllByTestId('self-healing-changes-card')[1]);
	expect(
		within(secondCard.getByRole('heading', { level: 3 })).getByRole('button', {
			name: 'Send email Sub-workflow',
		}),
	).toHaveAttribute('aria-expanded', 'true');
	expect(secondCard.getByRole('link', { name: 'Open Send email' })).toHaveAttribute(
		'href',
		'/workflow/child-1',
	);
	expect(activeNames(view)).toEqual([expect.stringContaining('Daily report')]);
});

it('nests a changed sub-workflow below unchanged callers that have no diff', async () => {
	const view = await renderChanges({
		suggestions: [suggestions[2]],
		workflows: [listed('workflow-1'), listed('middle'), listed('child-2', 'suggestion-3')],
		calls: [call('workflow-1', 'middle'), call('middle', 'child-2')],
	});

	expect(navItems(view)).toEqual([
		{ name: 'Daily report', unchanged: true, indent: '0' },
		{ name: 'Check order', unchanged: true, indent: '1' },
		{ name: 'Write log', unchanged: false, indent: '2' },
	]);
	const cards = view.getAllByTestId('self-healing-changes-card');
	expect(within(cards[0]).getByTestId('self-healing-changes-card-unchanged')).toHaveTextContent(
		'No proposed changes.',
	);
	expect(within(cards[1]).queryByTestId('saved-workflow-diff')).not.toBeInTheDocument();
	expect(within(cards[2]).getByTestId('saved-workflow-diff')).toHaveAttribute(
		'data-workflow-id',
		'child-2',
	);
	expect(within(cards[2]).getByTestId('self-healing-changes-card-callers')).toHaveTextContent(
		'Called by Check order',
	);
});

it('lists the workflows below their project', async () => {
	const view = await renderChanges({}, 'Operations');

	expect(view.getByTestId('self-healing-changes-project')).toHaveTextContent('Operations');
	expect(navItems(view)).toEqual([
		{ name: 'Daily report', unchanged: false, indent: '1' },
		{ name: 'Send email', unchanged: false, indent: '2' },
		{ name: 'Write log', unchanged: false, indent: '2' },
	]);
});

it('names every caller of a shared sub-workflow and opens a caller from the card', async () => {
	const view = await renderChanges({
		calls: [
			call('workflow-1', 'child-1'),
			call('workflow-1', 'child-2'),
			call('child-1', 'child-2'),
		],
	});

	expect(navItems(view).map(({ name }) => name)).toEqual([
		'Daily report',
		'Send email',
		'Write log',
	]);
	const shared = within(view.getAllByTestId('self-healing-changes-card')[2]);
	expect(shared.getByTestId('self-healing-changes-card-callers')).toHaveTextContent(
		'Called by Daily report and Send email',
	);

	await fireEvent.click(shared.getByRole('button', { name: 'Send email' }));
	expect(scrolledCard()).toBe(view.getAllByTestId('self-healing-changes-card')[1]);
	expect(activeNames(view)).toEqual([expect.stringContaining('Send email')]);
});

it('scrolls to a workflow diff when its navigation item is clicked', async () => {
	const view = await renderChanges();
	await fireEvent.click(view.getAllByTestId('self-healing-changes-nav-item')[2]);

	const cards = view.getAllByTestId('self-healing-changes-card');
	expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'start' });
	expect(scrolledCard()).toBe(cards[2]);
	expect(activeNames(view)).toEqual([expect.stringContaining('Write log')]);
});

it('collapses a workflow diff and opens it again from the navigation', async () => {
	const view = await renderChanges();
	const toggle = view.getAllByTestId('self-healing-changes-card-toggle')[1];

	await fireEvent.click(toggle);
	await nextTick();
	expect(toggle).toHaveAttribute('aria-expanded', 'false');
	expect(view.getAllByTestId('saved-workflow-diff').map((diff) => diff.dataset.workflowId)).toEqual(
		['workflow-1', 'child-2'],
	);

	await fireEvent.click(view.getAllByTestId('self-healing-changes-nav-item')[1]);
	await nextTick();
	expect(toggle).toHaveAttribute('aria-expanded', 'true');
	expect(scrolledCard()).toBe(view.getAllByTestId('self-healing-changes-card')[1]);
	expect(activeNames(view)).toEqual([expect.stringContaining('Send email')]);
});

it('highlights the workflow whose diff is in view while the list scrolls', async () => {
	const view = await renderChanges();
	const list = view.getAllByTestId('self-healing-changes-card')[0].parentElement as HTMLElement;
	Object.defineProperties(list, {
		clientHeight: { value: 300, configurable: true },
		scrollHeight: { value: 2000, configurable: true },
		scrollTop: { value: 600, configurable: true, writable: true },
	});
	list.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
	const tops = [-600, 50, 700];
	view.getAllByTestId('self-healing-changes-card').forEach((card, index) => {
		card.getBoundingClientRect = () => ({ top: tops[index] }) as DOMRect;
	});

	await fireEvent.scroll(list);
	expect(activeNames(view)).toEqual([expect.stringContaining('Send email')]);

	list.scrollTop = 1700;
	await fireEvent.scroll(list);
	expect(activeNames(view)).toEqual([expect.stringContaining('Write log')]);
});

it('keeps the clicked workflow highlighted while the list scrolls to it', async () => {
	vi.useFakeTimers();
	const view = await renderChanges();
	const list = view.getAllByTestId('self-healing-changes-card')[0].parentElement as HTMLElement;
	Object.defineProperties(list, {
		clientHeight: { value: 300, configurable: true },
		scrollHeight: { value: 2000, configurable: true },
		scrollTop: { value: 600, configurable: true, writable: true },
	});
	list.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
	const tops = [-600, 50, 700];
	view.getAllByTestId('self-healing-changes-card').forEach((card, index) => {
		card.getBoundingClientRect = () => ({ top: tops[index] }) as DOMRect;
	});

	await fireEvent.click(view.getAllByTestId('self-healing-changes-nav-item')[2]);
	await fireEvent.scroll(list);
	expect(activeNames(view)).toEqual([expect.stringContaining('Write log')]);

	vi.advanceTimersByTime(150);
	await fireEvent.scroll(list);
	expect(activeNames(view)).toEqual([expect.stringContaining('Send email')]);
});

it('renders a canvas only for diffs near the viewport', async () => {
	let notify: IntersectionObserverCallback = () => {};
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(onIntersect: IntersectionObserverCallback) {
				notify = onIntersect;
			}
			observe() {}
			disconnect() {}
		},
	);
	const view = await renderChanges();
	expect(view.queryAllByTestId('saved-workflow-diff')).toHaveLength(0);

	const cards = view.getAllByTestId('self-healing-changes-card');
	notify(
		[
			{ target: cards[0], isIntersecting: true },
			{ target: cards[1], isIntersecting: true },
		] as unknown as IntersectionObserverEntry[],
		{} as IntersectionObserver,
	);
	await nextTick();
	expect(view.getAllByTestId('saved-workflow-diff').map((diff) => diff.dataset.workflowId)).toEqual(
		['workflow-1', 'child-1'],
	);

	notify(
		[{ target: cards[0], isIntersecting: false }] as unknown as IntersectionObserverEntry[],
		{} as IntersectionObserver,
	);
	await nextTick();
	expect(view.getAllByTestId('saved-workflow-diff').map((diff) => diff.dataset.workflowId)).toEqual(
		['child-1'],
	);
});

it('explains when the comparison cannot render', async () => {
	componentRegistry.clear();
	const view = await renderChanges();

	expect(view.getByText(/The workflow comparison is unavailable/)).toBeInTheDocument();
});
