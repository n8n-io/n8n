import type { WorkflowTriggerCategory } from '@n8n/api-types';
import type { ComputedRef, InjectionKey } from 'vue';

/** The trigger category of each workflow, by workflow id. */
export type WorkflowCategories = ReadonlyMap<string, WorkflowTriggerCategory>;

/** A chip of a workflow below the provider of this key takes the color and the icon of the category. */
export const WORKFLOW_CATEGORIES: InjectionKey<ComputedRef<WorkflowCategories>> =
	Symbol('pageWorkflowCategories');
