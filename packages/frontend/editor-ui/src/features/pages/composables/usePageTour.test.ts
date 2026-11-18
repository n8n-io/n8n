import type { Page } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick, reactive, ref, type EffectScope } from 'vue';

import { usePagePeekStore } from '../pagePeek.store';
import { usePageTourStore } from '../pageTour.store';
import { usePageTour } from './usePageTour';

type TestNode = { id: string; name: string };

const mocks = vi.hoisted(() => ({
	route: undefined as unknown as { query: Record<string, string | undefined> },
	replace: vi.fn(),
	routeWorkflowId: undefined as unknown as { value: string },
	document: undefined as unknown as {
		value: { workflowId: string; findNodeByPartialId: (id: string) => unknown };
	},
	fetchPageById: vi.fn(),
	showMessage: vi.fn(),
	emit: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRoute: () => mocks.route,
	useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/app/composables/useWorkflowId', () => ({
	useRouteWorkflowId: () => mocks.routeWorkflowId,
}));
vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => mocks.document,
}));
vi.mock('@/features/workflows/canvas/canvas.eventBus', () => ({
	canvasEventBus: { emit: mocks.emit },
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: mocks.showMessage }),
}));
vi.mock('@n8n/frontend-module-page', () => ({
	usePageStore: () => ({ fetchPageById: mocks.fetchPageById }),
}));

const NODES: TestNode[] = [
	{ id: 'node-webhook-full-id', name: 'Webhook' },
	{ id: 'node-set-full-id', name: 'Edit Fields' },
];

const CONTENT = [
	'The [Webhook](/workflow/w1/node-webhook) node receives the order.',
	'',
	'A [deleted node](/workflow/w1/gone) was here.',
	'',
	'Then [](/workflow/w1/node-set-full-id) cleans the fields.',
].join('\n');

function toPage(content: string): Page {
	return {
		id: 'page-1',
		projectId: 'project-1',
		title: 'Runbook',
		content,
		version: 1,
		createdAt: '2026-11-16T10:00:00.000Z',
		updatedAt: '2026-11-16T10:00:00.000Z',
	};
}

function openWorkflow(workflowId: string) {
	return {
		workflowId,
		findNodeByPartialId: (partialId: string) => NODES.find(({ id }) => id.startsWith(partialId)),
	};
}

async function settle(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve));
	await nextTick();
}

describe('usePageTour', () => {
	let scope: EffectScope;

	async function runPageTour(): Promise<void> {
		scope = effectScope();
		scope.run(usePageTour);
		await settle();
	}

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		mocks.route = reactive({ query: { pageTour: 'page-1', keep: 'me' } });
		mocks.replace.mockImplementation(async ({ query }: { query: Record<string, string> }) => {
			mocks.route.query = query;
		});
		mocks.routeWorkflowId = ref('w1');
		mocks.document = ref(openWorkflow('w1'));
		mocks.fetchPageById.mockResolvedValue(toPage(CONTENT));
	});

	afterEach(() => {
		scope.stop();
	});

	it('should start the tour that the address asks for and show its first step', async () => {
		await runPageTour();
		const store = usePageTourStore();

		expect(mocks.fetchPageById).toHaveBeenCalledWith('page-1');
		expect(store.isActive).toBe(true);
		expect(store.pageTitle).toBe('Runbook');
		expect(store.currentStep?.text).toBe('The Webhook node receives the order.');
		expect(mocks.emit).toHaveBeenCalledWith('nodes:zoomTo', { ids: ['node-webhook-full-id'] });
		expect(mocks.showMessage).not.toHaveBeenCalled();
	});

	it('should remove the tour request from the address and keep the rest of the query', async () => {
		await runPageTour();

		expect(mocks.replace).toHaveBeenCalledWith({ query: { keep: 'me', pageTour: undefined } });
		expect(mocks.fetchPageById).toHaveBeenCalledTimes(1);
	});

	it('should leave out a node that is not in the workflow and name a link without label', async () => {
		await runPageTour();
		const store = usePageTourStore();

		expect(store.stepCount).toBe(2);
		store.next();
		await nextTick();

		expect(store.currentStep).toEqual({
			nodeIds: ['node-set-full-id'],
			text: 'Then Edit Fields cleans the fields.',
		});
		expect(mocks.emit).toHaveBeenLastCalledWith('nodes:zoomTo', { ids: ['node-set-full-id'] });
	});

	it('should show the step again when the user goes back', async () => {
		await runPageTour();
		const store = usePageTourStore();
		store.next();
		await nextTick();

		store.previous();
		await nextTick();

		expect(mocks.emit).toHaveBeenCalledTimes(3);
		expect(mocks.emit).toHaveBeenLastCalledWith('nodes:zoomTo', { ids: ['node-webhook-full-id'] });
	});

	it('should move nothing when the tour finishes', async () => {
		await runPageTour();
		const store = usePageTourStore();
		store.next();
		await nextTick();

		store.next();
		await nextTick();

		expect(store.isActive).toBe(false);
		expect(mocks.emit).toHaveBeenCalledTimes(2);
	});

	it.each([
		['links to no node that is still in the workflow', 'Only [gone](/workflow/w1/gone).'],
		['links to a node of another workflow', 'See [other](/workflow/w2/node-webhook).'],
		['links to no node', 'Plain text.'],
	])('should warn and start no tour when the page %s', async (_case, content) => {
		mocks.fetchPageById.mockResolvedValue(toPage(content));

		await runPageTour();

		expect(usePageTourStore().isActive).toBe(false);
		expect(mocks.emit).not.toHaveBeenCalled();
		expect(mocks.showMessage).toHaveBeenCalledWith({
			type: 'warning',
			title: 'Could not start the tour',
			message: 'The page links to no node of this workflow.',
		});
		expect(mocks.route.query.pageTour).toBeUndefined();
	});

	it('should warn and start no tour when the page cannot be read', async () => {
		mocks.fetchPageById.mockRejectedValue(new Error('Not found'));

		await runPageTour();

		expect(usePageTourStore().isActive).toBe(false);
		expect(mocks.showMessage).toHaveBeenCalledTimes(1);
		expect(mocks.route.query.pageTour).toBeUndefined();
	});

	it('should do nothing when the address asks for no tour', async () => {
		mocks.route.query = {};

		await runPageTour();

		expect(mocks.fetchPageById).not.toHaveBeenCalled();
		expect(mocks.showMessage).not.toHaveBeenCalled();
	});

	it('should wait until the workflow of the address is open', async () => {
		mocks.document.value = openWorkflow('w0');
		await runPageTour();
		expect(mocks.fetchPageById).not.toHaveBeenCalled();

		mocks.document.value = openWorkflow('w1');
		await settle();

		expect(usePageTourStore().isActive).toBe(true);
	});

	it('should start a tour that is asked for later', async () => {
		mocks.route.query = {};
		await runPageTour();

		mocks.route.query = { pageTour: 'page-1' };
		await settle();

		expect(usePageTourStore().isActive).toBe(true);
	});

	it('should close the page side panel when the tour starts', async () => {
		usePagePeekStore().open('page-1');

		await runPageTour();

		expect(usePagePeekStore().pageId).toBeUndefined();
	});

	it('should end the tour when the address opens another workflow', async () => {
		await runPageTour();

		mocks.routeWorkflowId.value = 'w2';
		await nextTick();

		expect(usePageTourStore().isActive).toBe(false);
	});

	it('should end the tour when its owner goes away', async () => {
		await runPageTour();

		scope.stop();

		expect(usePageTourStore().isActive).toBe(false);
	});
});
