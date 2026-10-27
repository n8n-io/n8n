import type { N8nIcon } from '@n8n/design-system';

export const resourceLinkIcons: Record<string, InstanceType<typeof N8nIcon>['$props']['icon']> = {
	'/workflow': 'workflow',
	'/assistant': 'message-circle',
	'/agents': 'bot',
};

export function getResourceLinkIcon(href: string, origin = window.location.origin) {
	try {
		const url = new URL(href, origin);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
		if (url.hostname !== new URL(origin).hostname) return undefined;
		for (const [path, icon] of Object.entries(resourceLinkIcons)) {
			if (`${url.pathname}/`.includes(`${path}/`)) return icon;
		}
	} catch {
		return undefined;
	}
	return undefined;
}
