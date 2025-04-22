import type { Controller, ControllerMetadata, HandlerName, RouteMetadata } from './types';

// State storage for controller metadata
const controllerRegistry = new Map<Controller, ControllerMetadata>();

/**
 * Gets metadata for a controller class, creating it if it doesn't exist
 */
export const getControllerMetadata = (controllerClass: Controller) => {
	let metadata = controllerRegistry.get(controllerClass);
	if (!metadata) {
		metadata = {
			basePath: '/',
			middlewares: [],
			routes: new Map(),
		};
		controllerRegistry.set(controllerClass, metadata);
	}
	return metadata;
};

/**
 * Gets metadata for a specific route in a controller, creating it if it doesn't exist
 */
export const getRouteMetadata = (controllerClass: Controller, handlerName: HandlerName) => {
	const metadata = getControllerMetadata(controllerClass);
	let route = metadata.routes.get(handlerName);
	if (!route) {
		route = {} as RouteMetadata;
		route.args = [];
		metadata.routes.set(handlerName, route);
	}
	return route;
};

/**
 * Gets all controller classes with their metadata
 */
export const getAllControllerEntries = () => controllerRegistry.entries();
