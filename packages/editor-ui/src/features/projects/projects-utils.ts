export const routeMapping = {
	'old-path': '/new-path',
	'another-old-path': '/another-new-path',
};

export const translateOldRouteToNew = (oldRoute: keyof typeof routeMapping) => {
	return routeMapping[oldRoute] || '/fallback-path';
};
