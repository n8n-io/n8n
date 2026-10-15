import type { McpRegistryServerIconResponse } from '@n8n/api-types';

import type { NodeIconSource } from './types';

export function iconForMcpRegistryServer(
	icons: McpRegistryServerIconResponse[],
	appliedTheme: 'light' | 'dark',
): NodeIconSource {
	const themed = icons.find((icon) => icon.theme === appliedTheme);
	const untagged = icons.find((icon) => icon.theme === undefined);
	const src = (themed ?? untagged ?? icons[0])?.src;
	return src ? { type: 'file', src } : { type: 'icon', name: 'mcp' };
}
