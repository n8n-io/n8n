import type { N8nIcon as ResourceIcon } from '@n8n/design-system';

export const resourceIcons: Record<string, InstanceType<typeof ResourceIcon>['$props']['icon']> = {
	workflow: 'workflow',
	credential: 'key',
	'data-table': 'table',
	agent: 'bot',
	assistant: 'message-circle',
};
export const INTERNAL_ROUTE_PATTERNS = [
	{ pattern: /^\/workflow\/([a-zA-Z0-9]+)/, type: 'workflow' },
	{ pattern: /^\/(?:home\/)?credentials(?:\/|$)/, type: 'credential' },
	{ pattern: /^\/(?:home\/)?data-?tables(?:\/|$)/, type: 'data-table' },
	{ pattern: /^\/home\/agents(?:\/|$)/, type: 'agent' },
	{ pattern: /^\/projects\/[^/]+\/credentials(?:\/|$)/, type: 'credential' },
	{ pattern: /^\/projects\/[^/]+\/datatables(?:\/|$)/, type: 'data-table' },
	{ pattern: /^\/projects\/[^/]+\/agents(?:\/|$)/, type: 'agent' },
];

export function getResourceLinkIcon(href: string, origin = window.location.origin) {
	try {
		const url = new URL(href, origin);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
		if (url.hostname !== new URL(origin).hostname) return undefined;
		for (const [path, type] of [
			['/workflow', 'workflow'],
			['/assistant', 'assistant'],
			['/agents', 'agent'],
		] as const) {
			if (`${url.pathname}/`.includes(`${path}/`)) return resourceIcons[type];
		}
	} catch {
		return undefined;
	}
	return undefined;
}

export function getSameOriginUrl(href: string): URL | undefined {
	const isRootRelative = href.startsWith('/') && !href.startsWith('//');
	if (!isRootRelative && !/^[a-z][a-z\d+.-]*:/i.test(href)) return undefined;
	try {
		const url = new URL(href, window.location.origin);
		return url.origin === window.location.origin ? url : undefined;
	} catch {
		return undefined;
	}
}

export function decodeResourceId(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function buildResourceUrl(type: string, id: string, projectId: string | undefined): string {
	if (projectId) {
		if (type === 'data-table') return `/projects/${projectId}/datatables/${id}`;
		if (type === 'credential') return `/projects/${projectId}/credentials/${id}`;
		if (type === 'agent') return `/projects/${projectId}/agents/${id}`;
	}
	if (type === 'workflow') return `/workflow/${id}`;
	if (type === 'credential') return `/home/credentials/${id}`;
	if (type === 'data-table') return '/home/datatables';
	if (type === 'agent') return '/home/agents';
	return '#';
}
