import { componentRegistry } from '@n8n/frontend-module-sdk';
import { defineAsyncComponent } from 'vue';

/**
 * Shell-hosted components that modules render but do not own — the counterpart to
 * `modals.manifest.ts` for the `componentRegistry` slots.
 *
 * Async on purpose: registering these eagerly would pull the owning feature into
 * the boot chunk (the project filter reaches the projects store and ProjectSharing's
 * design-system tree), which is exactly what a module renders a slot to avoid.
 */
export const registerComponentSlots = () => {
	componentRegistry.register(
		'workflow-diff',
		defineAsyncComponent(
			async () => await import('@/features/workflows/workflowDiff/WorkflowDiffSlot.vue'),
		),
	);

	componentRegistry.register(
		'promotion-changes',
		defineAsyncComponent(
			async () =>
				await import(
					'@/features/integrations/promotions.ee/components/review/PromotionReviewChanges.vue'
				),
		),
	);

	componentRegistry.register(
		'project-filter',
		defineAsyncComponent(
			async () => await import('@/features/collaboration/projects/components/ProjectFilter.vue'),
		),
	);

	componentRegistry.register(
		'project-header',
		defineAsyncComponent(
			async () => await import('@/features/collaboration/projects/components/ProjectHeader.vue'),
		),
	);

	componentRegistry.register(
		'insights-summary',
		defineAsyncComponent(
			async () =>
				await import('@/features/collaboration/projects/components/InsightsSummarySlot.vue'),
		),
	);

	componentRegistry.register(
		'resources-list-layout',
		defineAsyncComponent(
			async () => await import('@/app/components/layouts/ResourcesListLayout.vue'),
		),
	);
};
