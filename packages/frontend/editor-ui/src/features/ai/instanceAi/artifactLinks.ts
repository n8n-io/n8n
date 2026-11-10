import { useRouter, type RouteLocationRaw } from 'vue-router';
import { APP_DETAIL_VIEW } from '@n8n/frontend-module-apps';
import { VIEWS } from '@/app/constants';
import { getSameOriginUrl } from '@/features/ai/shared/components/ChatMarkdown/ChatResourceLink.utils';
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
	 * Removes the router base once, so the link matches the app routes. A base
	 * that is also an app route segment, such as `/workflow/`, is not supported
	 * for links that leave out the base.
	 */
	function toRouterPath(href: string): RouterPath | undefined {
		const url = getSameOriginUrl(href);
		if (!url) return undefined;
		const base = router.options.history.base;
		const hasBase = base !== '' && (url.pathname === base || url.pathname.startsWith(`${base}/`));
		const pathname = hasBase ? url.pathname.slice(base.length) || '/' : url.pathname;
		return { pathname, fullPath: `${pathname}${url.search}${url.hash}` };
	}

	return {
		artifactHref,
		artifactUrl,
		openArtifactInNewTab,
		routerPathHref,
		toRouterPath,
	};
}
