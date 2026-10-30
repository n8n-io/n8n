import { computed } from 'vue';
import vueJsonPretty from 'vue-json-pretty';
import { EnterprisePlanKey } from '@n8n/design-system';
import { defineRenderer, type RenderOptions } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { GlobalDirectivesPlugin } from '@/app/plugins/directives';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

export type { RenderOptions };

/**
 * The shell's renderer: the shared base from `@n8n/frontend-test-utils`, plus the things
 * that belong to the editor core and to no module — the touch-events directive, the
 * `VueJsonPretty` stub, the workflow document store, and the enterprise plan.
 *
 * These are an extension rather than options on one renderer: a module never wants them, and a
 * flag would put shell imports in every module's test graph.
 */
export const { renderComponent, createComponentRenderer } = defineRenderer({
	plugins: [GlobalDirectivesPlugin],
	stubs: { VueJsonPretty: vueJsonPretty },
	// Mirror App.vue, which always provides the workflow document store and the enterprise plan.
	// injectNDVStore()/injectWorkflowDocumentStore() resolve strictly from this key, so a default
	// keeps components that don't set up their own scope working (replicates the former
	// workflowId-based fallback). Tests override it by passing their own `global.provide`.
	//
	// A thunk, not an object: `useWorkflowDocumentStore()` has to run per render, inside the pinia
	// that render activated. The plan read tolerates a settings-store mock that omits the field.
	provide: () => ({
		[WorkflowDocumentStoreKey as symbol]: computed(() =>
			useWorkflowDocumentStore(createWorkflowDocumentId(useWorkflowsStore().workflowId)),
		),
		[EnterprisePlanKey as symbol]: computed(() => useSettingsStore?.()?.isEnterprisePlan === true),
	}),
});
