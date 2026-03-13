import type { RouteLocationNormalized } from 'vue-router';
import type { Resource } from '@n8n/permissions';

export function inferProjectIdFromRoute(to: RouteLocationNormalized): string {
	const routeParts = to.path.split('/');
	const projectsIndex = routeParts.indexOf('projects');
	const projectIdIndex = projectsIndex !== -1 ? projectsIndex + 1 : -1;

	return routeParts[projectIdIndex];
}

const pathToResource: Record<string, Resource> = {
	workflows: 'workflow',
	credentials: 'credential',
	users: 'user',
	variables: 'variable',
	'source-control': 'sourceControl',
	'external-secrets': 'externalSecret',
};

export function inferResourceTypeFromRoute(to: RouteLocationNormalized): Resource | undefined {
	const parts = to.path.split('/');
	for (const part of parts) {
		const resource = pathToResource[part];
		if (resource) return resource;
	}
	return undefined;
}

export function inferResourceIdFromRoute(to: RouteLocationNormalized): string | undefined {
	return (to.params.id as string | undefined) ?? (to.params.name as string | undefined);
}
