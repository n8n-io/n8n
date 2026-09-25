import { getResourcePermissions } from '@n8n/permissions';
import { useRouter } from 'vue-router';

import type { WorkflowResource } from '@/Interface';
import { INSTANCE_AI_NEW_VIEW } from '@/features/ai/instanceAi/constants';

import { useOpenWorkflowInAssistantStore } from '../stores/openWorkflowInAssistant.store';

/** The experiment only touches cards the user could edit anyway, in a project. */
export function canOpenInAssistant(workflow: WorkflowResource, readOnly?: boolean) {
	return (
		Boolean(getResourcePermissions(workflow.scopes).workflow.update) &&
		!readOnly &&
		!workflow.isArchived &&
		Boolean(workflow.homeProject?.id)
	);
}

/**
 * Intercepts a workflow card click for treatment users. Returns false when the
 * card should open the way it always has, so the host keeps its own body.
 * Synchronous, because `window.open` must stay in the click's own task.
 */
export function useOpenInAssistantCard(props: { data: WorkflowResource; readOnly?: boolean }) {
	const router = useRouter();
	const store = useOpenWorkflowInAssistantStore();

	return (event?: KeyboardEvent | PointerEvent) => {
		if (!canOpenInAssistant(props.data, props.readOnly) || !store.opensInAssistant) return false;

		const route = { name: INSTANCE_AI_NEW_VIEW, query: { workflowId: props.data.id } };
		if (event?.ctrlKey || event?.metaKey) {
			window.open(router.resolve(route).href, '_blank');
		} else {
			void router.push(route);
		}
		return true;
	};
}
