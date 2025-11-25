import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/app/constants/workflows';
export const getWorkflowId = (propId: string, routeName: string | string[]) => {
	let id: string | undefined = undefined;
	if (propId !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
		id = propId;
	} else if (routeName && routeName !== 'new') {
		id = routeName as string;
	}

	return id;
};
