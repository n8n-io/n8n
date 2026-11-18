import { PAGE_TOUR_QUERY_PARAMETER, extractTourSteps, type PageTourStep } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { usePageStore } from '@n8n/frontend-module-page';
import { useI18n } from '@n8n/i18n';
import { computed, onScopeDispose, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryValue } from 'vue-router';

import { useRouteWorkflowId } from '@/app/composables/useWorkflowId';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { isPresent } from '@/app/utils/typesUtils';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

import { usePageTourStore, type PageTourContent } from '../pageTour.store';

function toPageId(
	value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Runs the tour of a page on the canvas of the open workflow.
 * A tour starts when the address asks for one with the page tour query parameter
 * and the open workflow is the workflow of the address. The parameter is then removed.
 * A node that is not in the workflow is left out. A warning toast shows when no step is left
 * or when the page cannot be read.
 * Each step selects its nodes and moves the canvas to them.
 * The tour ends when the address opens another workflow and when the owner scope ends.
 */
export function usePageTour() {
	const i18n = useI18n();
	const toast = useToast();
	const route = useRoute();
	const router = useRouter();
	const routeWorkflowId = useRouteWorkflowId();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const pageStore = usePageStore();
	const tourStore = usePageTourStore();

	/** The page whose tour the address asks for. No page while another workflow is still open. */
	const requestedPageId = computed(() => {
		const isRouteWorkflowOpen = workflowDocumentStore.value.workflowId === routeWorkflowId.value;
		return isRouteWorkflowOpen ? toPageId(route.query[PAGE_TOUR_QUERY_PARAMETER]) : undefined;
	});

	/** Finds a node of the open workflow from the id that a link holds. */
	function findLinkedNode(linkedNodeId: string) {
		return workflowDocumentStore.value.findNodeByPartialId(linkedNodeId);
	}

	/** Keeps the nodes that are in the open workflow. A step that has no node left is removed. */
	function toStepsOfOpenWorkflow(steps: PageTourStep[]): PageTourStep[] {
		return steps
			.map((step) => ({
				...step,
				nodeIds: step.nodeIds.map((nodeId) => findLinkedNode(nodeId)?.id).filter(isPresent),
			}))
			.filter(({ nodeIds }) => nodeIds.length > 0);
	}

	/** Reads the tour that a page gives for the open workflow. Rejects when the page cannot be read. */
	async function readTourContent(pageId: string): Promise<PageTourContent> {
		const page = await pageStore.fetchPageById(pageId);
		const tour = extractTourSteps(
			page.content,
			(nodeId) => findLinkedNode(nodeId)?.name,
			workflowDocumentStore.value.workflowId,
		);
		return { pageTitle: page.title, steps: toStepsOfOpenWorkflow(tour?.steps ?? []) };
	}

	async function removeTourRequestFromAddress(): Promise<void> {
		await router.replace({ query: { ...route.query, [PAGE_TOUR_QUERY_PARAMETER]: undefined } });
	}

	function warnThatTourCannotStart(): void {
		toast.showMessage({
			type: 'warning',
			title: i18n.baseText('page.tour.cannotStart.title'),
			message: i18n.baseText('page.tour.cannotStart.message'),
		});
	}

	function startOrWarn(content: PageTourContent | undefined): void {
		if (content !== undefined && content.steps.length > 0) {
			tourStore.start(content);
		} else {
			warnThatTourCannotStart();
		}
	}

	/** Starts the tour of the requested page. A request that changed during the read is dropped. */
	async function startRequestedTour(pageId: string | undefined): Promise<void> {
		if (pageId !== undefined) {
			const content = await readTourContent(pageId).catch(() => undefined);
			if (requestedPageId.value === pageId) {
				await removeTourRequestFromAddress();
				startOrWarn(content);
			}
		}
	}

	function showStepOnCanvas(step: PageTourStep | undefined): void {
		if (step !== undefined) {
			canvasEventBus.emit('nodes:zoomTo', { ids: step.nodeIds });
		}
	}

	watch(requestedPageId, startRequestedTour, { immediate: true });
	watch(() => tourStore.currentStep, showStepOnCanvas);
	watch(routeWorkflowId, tourStore.end);
	onScopeDispose(tourStore.end);
}
