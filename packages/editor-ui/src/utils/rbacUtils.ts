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
	const routeMap = {
		workflow: 'workflows',
		credential: 'credentials',
		user: 'users',
		variable: 'variables',
		sourceControl: 'source-control',
		externalSecretsStore: 'external-secrets',
	};

	for (const resource of Object.keys(routeMap) as Array<keyof typeof routeMap>) {
		if (routeParts.includes(routeMap[resource])) {
			return resource;
		}
	}
}

export function inferResourceIdFromRoute(to: RouteLocationNormalized): string | undefined {
	return (to.params.id as string | undefined) ?? (to.params.name as string | undefined);
}
