import { getNodeIcon, getNodeIconUrl } from '@/utils/nodeIcon';
import type { SimplifiedNodeType } from '@/Interface';

export function getIconSource(nodeType: SimplifiedNodeType | null, baseUrl: string) {
	if (!nodeType) return {};
	const iconUrl = getNodeIconUrl(nodeType);
	if (iconUrl) {
		return { path: baseUrl + iconUrl };
	}
	// Otherwise, extract it from icon prop
	if (nodeType.icon) {
		const icon = getNodeIcon(nodeType);
		if (icon) {
			const [type, path] = icon.split(':');
			if (type === 'file') {
				return {};
			}
			return { icon: path };
		}
	}
	return {};
}
