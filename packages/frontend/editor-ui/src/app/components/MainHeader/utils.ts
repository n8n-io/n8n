export const getWorkflowId = (propId?: string, routeName?: string | string[]) => {
	return propId ?? (typeof routeName === 'string' ? routeName : undefined);
};
