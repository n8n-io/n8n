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
]);

async function renderChanges(items = suggestions) {
	const view = renderComponent({
		props: { suggestions: items, triggeringWorkflowId: 'workflow-1', workflowNames },
	});
	await nextTick();
	return view;
}

function activeNames(view: Awaited<ReturnType<typeof renderChanges>>) {
	return view
		.getAllByTestId('self-healing-changes-nav-item')
		.filter((item) => item.getAttribute('aria-current') === 'true')
		.map((item) => item.textContent?.trim());
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

it('shows one workflow diff in the same card layout without navigation', async () => {
	const view = await renderChanges([suggestion()]);

	expect(view.queryByRole('navigation')).not.toBeInTheDocument();
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
	const nav = within(view.getByRole('navigation', { name: 'Changed workflows' }));

	expect(nav.getAllByRole('listitem').map((item) => item.textContent?.trim())).toEqual([
		'Daily report',
		'Send email',
		'Write log',
	]);
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

it('lists the failing workflow first when the suggestions start with a sub-workflow', async () => {
	const view = await renderChanges([suggestions[1], suggestions[0], suggestions[2]]);

	expect(view.getAllByTestId('saved-workflow-diff').map((diff) => diff.dataset.workflowId)).toEqual(
		['workflow-1', 'child-1', 'child-2'],
	);
	expect(view.getAllByTestId('self-healing-changes-nav-item')[0]).toHaveTextContent('Daily report');
	expect(activeNames(view)).toEqual([expect.stringContaining('Daily report')]);
});

it('does not indent the sub-workflows when the failing workflow is not changed', async () => {
	const view = await renderChanges([suggestions[1], suggestions[2]]);
	const items = view.getAllByTestId('self-healing-changes-nav-item');

	expect(items.map((item) => item.textContent?.trim())).toEqual(['Send email', 'Write log']);
	for (const item of items) expect(item.className).not.toMatch(/nested/);
});

it('scrolls to a workflow diff when its navigation item is clicked', async () => {
	const view = await renderChanges();
	await fireEvent.click(view.getAllByTestId('self-healing-changes-nav-item')[2]);

	const cards = view.getAllByTestId('self-healing-changes-card');
	expect(cards[2].scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
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
	expect(view.getAllByTestId('self-healing-changes-card')[1].scrollIntoView).toHaveBeenCalled();
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
