import { computed } from 'vue';
import vueJsonPretty from 'vue-json-pretty';
import { defineRenderer, type RenderOptions } from '@n8n/frontend-test-utils';
import { GlobalDirectivesPlugin } from '@/app/plugins/directives';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

export type { RenderOptions };

/**
 * The shell's renderer: the shared base from `@n8n/frontend-test-utils`, plus the three things
 * that belong to the editor core and to no module — the touch-events directive, the
 * `VueJsonPretty` stub, and the workflow document store.
 *
 * These are an extension rather than options on one renderer: a module never wants them, and a
 * flag would put shell imports in every module's test graph.
 */
export const { renderComponent, createComponentRenderer } = defineRenderer({
	plugins: [GlobalDirectivesPlugin],
	stubs: { VueJsonPretty: vueJsonPretty },
	// Mirror App.vue, which always provides the workflow document store.
	// injectNDVStore()/injectWorkflowDocumentStore() resolve strictly from this key, so a default
	// keeps components that don't set up their own scope working (replicates the former
	// workflowId-based fallback). Tests override it by passing their own `global.provide`.
	//
	// A thunk, not an object: `useWorkflowDocumentStore()` has to run per render, inside the pinia
	// that render activated.
	provide: () => ({
		[WorkflowDocumentStoreKey as symbol]: computed(() =>
			useWorkflowDocumentStore(createWorkflowDocumentId(useWorkflowsStore().workflowId)),
		),
	}),
});
