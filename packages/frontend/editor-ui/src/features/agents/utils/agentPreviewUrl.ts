import { OPEN_PREVIEW_PARAM } from '../constants';

export interface AgentPreviewLinkTarget {
	projectId: string;
	agentId: string;
	href: string;
}

const AGENT_PREVIEW_PATH = /^\/projects\/([^/]+)\/agents\/([^/]+)\/preview\/?$/;
const AGENT_BUILDER_PATH = /^\/projects\/([^/]+)\/agents\/([^/]+)\/?$/;
const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:/i;

function decodePathSegment(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function resolveAgentPreviewLink(
	href: string,
	origin = window.location.origin,
): AgentPreviewLinkTarget | undefined {
	const isRootRelative = href.startsWith('/') && !href.startsWith('//');
	const isAbsolute = ABSOLUTE_URL_PATTERN.test(href);
	if (!isRootRelative && !isAbsolute) return undefined;

	try {
		const url = new URL(href, origin);
		if (url.origin !== origin) return undefined;

		const match =
			AGENT_PREVIEW_PATH.exec(url.pathname) ??
			(url.searchParams.get(OPEN_PREVIEW_PARAM) === 'true'
				? AGENT_BUILDER_PATH.exec(url.pathname)
				: null);
		if (!match) return undefined;

		const searchParams = new URLSearchParams(url.search);
		searchParams.set(OPEN_PREVIEW_PARAM, 'true');

		return {
			projectId: decodePathSegment(match[1]),
			agentId: decodePathSegment(match[2]),
			href: `/projects/${match[1]}/agents/${match[2]}?${searchParams.toString()}`,
		};
	} catch {
		return undefined;
	}
}
