import { useRouter, type RouteLocationRaw } from 'vue-router';
import { APP_DETAIL_VIEW } from '@n8n/frontend-module-apps';
import { VIEWS } from '@/app/constants';
import { AGENT_BUILDER_VIEW, AGENTS_LIST_VIEW } from '@/features/agents/constants';
import { DATA_TABLE_DETAILS, DATA_TABLE_VIEW } from '@/features/core/dataTable/constants';

const ARTIFACT_LINK_TYPES = [
	'workflow',
	'credential',
	'data-table',
	'agent',
	'skill',
	'app',
] as const;

export type ArtifactLinkType = (typeof ARTIFACT_LINK_TYPES)[number];

export function isArtifactLinkType(value: string): value is ArtifactLinkType {
	return ARTIFACT_LINK_TYPES.some((type) => type === value);
}

/**
 * The named route of a resource. Without a project, a data table or an agent
 * falls back to its list, and an app has no route.
 */
function artifactRoute(
	type: ArtifactLinkType,
	id: string,
	projectId?: string,
): RouteLocationRaw | undefined {
	switch (type) {
		case 'workflow':
			return { name: VIEWS.WORKFLOW, params: { workflowId: id } };
		case 'credential':
			return projectId
				? { name: VIEWS.PROJECTS_CREDENTIALS, params: { projectId, credentialId: id } }
				: { name: VIEWS.CREDENTIALS, params: { credentialId: id } };
		case 'data-table':
			return projectId
				? { name: DATA_TABLE_DETAILS, params: { projectId, id } }
				: { name: DATA_TABLE_VIEW };
		case 'agent':
			return projectId
				? { name: AGENT_BUILDER_VIEW, params: { projectId, agentId: id } }
				: { name: AGENTS_LIST_VIEW };
		case 'skill':
			return { name: VIEWS.SETTINGS_CONTEXT_SKILLS, query: { skillId: id } };
		case 'app':
			return projectId ? { name: APP_DETAIL_VIEW, params: { projectId, appId: id } } : undefined;
	}
}

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:/i;

interface RouterPath {
	pathname: string;
	fullPath: string;
}

export function useArtifactLinks() {
	const router = useRouter();

	function artifactHref(
		type: ArtifactLinkType,
		id: string,
		projectId?: string,
	): string | undefined {
		const route = artifactRoute(type, id, projectId);
		return route ? router.resolve(route).href : undefined;
	}

	function artifactUrl(type: ArtifactLinkType, id: string, projectId?: string): string | undefined {
		const href = artifactHref(type, id, projectId);
		return href ? new URL(href, window.location.origin).toString() : undefined;
	}

	function openArtifactInNewTab(type: ArtifactLinkType, id: string, projectId?: string): boolean {
		const href = artifactHref(type, id, projectId);
		if (!href) return false;
		window.open(href, '_blank', 'noopener');
		return true;
	}

	/** Adds the router base and keeps the path, query and fragment as written. */
	function routerPathHref(fullPath: string): string {
		return router.options.history.createHref(fullPath);
	}

	/**
	 * Prefer a known app route without the base. Otherwise, offer both paths because
	 * a base such as `/projects/` can also start an unprefixed app route.
	 */
	function toRouterPaths(href: string): RouterPath[] {
		const isRootRelative = href.startsWith('/') && !href.startsWith('//');
		if (!isRootRelative && !ABSOLUTE_URL_PATTERN.test(href)) return [];

		let url: URL;
		try {
			url = new URL(href, window.location.origin);
		} catch {
			return [];
		}
		if (url.origin !== window.location.origin) return [];

		const toRouterPath = (pathname: string) => ({
			pathname,
			fullPath: `${pathname}${url.search}${url.hash}`,
		});
		const base = router.options.history.base;
		const hasBase = base !== '' && (url.pathname === base || url.pathname.startsWith(`${base}/`));
		if (!hasBase) return [toRouterPath(url.pathname)];
		const withoutBase = toRouterPath(url.pathname.slice(base.length) || '/');
		const route = router.resolve(withoutBase.fullPath);
		// Unnamed legacy redirects must not override canonical paths such as `/home/credentials`.
		if (route.name && route.name !== VIEWS.NOT_FOUND) return [withoutBase];
		return [withoutBase, toRouterPath(url.pathname)];
	}

	return {
		artifactHref,
		artifactUrl,
		openArtifactInNewTab,
		routerPathHref,
		toRouterPaths,
	};
}
