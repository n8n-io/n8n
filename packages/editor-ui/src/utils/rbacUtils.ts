import type { RouteLocationNormalized } from 'vue-router';
import type { Resource } from '@n8n/permissions';

export function inferProjectIdFromRoute(to: RouteLocationNormalized): string {
	const routeParts = to.path.split('/');
	const projectsIndex = routeParts.indexOf('projects');
	const projectIdIndex = projectsIndex !== -1 ? projectsIndex + 1 : -1;

	return routeParts[projectIdIndex];
}

export function inferResourceTypeFromRoute(to: RouteLocationNormalized): Resource | undefined {
	const routeParts = to.path.split('/');
	const routeMap: Record<string, string> = {
		workflow: 'workflows',
		credential: 'credentials',
		user: 'users',
		variable: 'variables',
		sourceControl: 'source-control',
		externalSecret: 'external-secrets',
	};

	const isResource = (key: string): key is Resource => routeParts.includes(routeMap[key]);

	for (const resource of Object.keys(routeMap)) {
		if (isResource(resource)) {
			return resource;
		}
	}

	return undefined;
}

export function inferResourceIdFromRoute(to: RouteLocationNormalized): string | undefined {
	return (to.params.id as string | undefined) ?? (to.params.name as string | undefined);
}
