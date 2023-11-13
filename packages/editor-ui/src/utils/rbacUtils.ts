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

	switch (true) {
		case routeParts.includes('workflows'):
			return 'workflow';
		case routeParts.includes('credentials'):
			return 'credential';
		case routeParts.includes('users'):
			return 'user';
		case routeParts.includes('variables'):
			return 'variable';
		case routeParts.includes('source-control'):
			return 'sourceControl';
		case routeParts.includes('external-secrets'):
			return 'externalSecretsStore';
		default:
			return undefined;
	}
}

export function inferResourceIdFromRoute(to: RouteLocationNormalized): string | undefined {
	return (to.params.id as string | undefined) ?? (to.params.name as string | undefined);
}
