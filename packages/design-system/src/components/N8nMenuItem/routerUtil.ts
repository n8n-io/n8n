import type { IMenuItem, RouteObject } from '@/types';
import type { RouteLocationRaw } from 'vue-router';

/**
 * Checks if the given menu item matches the current route.
 */
export function doesMenuItemMatchCurrentRoute(item: IMenuItem, currentRoute: RouteObject) {
	let activateOnRouteNames: string[] = [];
	if (Array.isArray(item.activateOnRouteNames)) {
		activateOnRouteNames = item.activateOnRouteNames;
	} else if (item.route && isNamedRouteLocation(item.route.to)) {
		activateOnRouteNames = [item.route.to.name];
	}

	let activateOnRoutePaths: string[] = [];
	if (Array.isArray(item.activateOnRoutePaths)) {
		activateOnRoutePaths = item.activateOnRoutePaths;
	} else if (item.route && isPathRouteLocation(item.route.to)) {
		activateOnRoutePaths = [item.route.to.path];
	}

	return (
		activateOnRouteNames.includes(currentRoute.name ?? '') ||
		activateOnRoutePaths.includes(currentRoute.path)
	);
}

function isPathRouteLocation(routeLocation?: RouteLocationRaw): routeLocation is { path: string } {
	return (
		typeof routeLocation === 'object' &&
		'path' in routeLocation &&
		typeof routeLocation.path === 'string'
	);
}

function isNamedRouteLocation(routeLocation?: RouteLocationRaw): routeLocation is { name: string } {
	return (
		typeof routeLocation === 'object' &&
		'name' in routeLocation &&
		typeof routeLocation.name === 'string'
	);
}
