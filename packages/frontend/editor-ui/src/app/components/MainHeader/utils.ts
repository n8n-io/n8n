export const getWorkflowId = (propId?: string, routeName?: string | string[]) => {
	let id: string | undefined = undefined;
	if (propId) {
		id = propId;
	} else if (routeName && routeName !== 'new') {
		id = routeName as string;
	}

	return id;
};
