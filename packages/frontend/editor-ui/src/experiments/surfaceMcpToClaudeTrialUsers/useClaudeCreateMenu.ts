import { computed, type ComputedRef } from 'vue';
import { useMcpDiscovery } from './useMcpDiscovery';

export function useClaudeCreateMenu<Item>(
	menu: ComputedRef<Item[]>,
	handleMenuSelect: (id: string) => unknown,
) {
	const { showMcpDiscovery, mcpDiscovery, entryLabel, openEntry } = useMcpDiscovery();
	const claudeAppendSlotName = 'item.append.claude-mcp';
	const claudeMenu = computed(() =>
		showMcpDiscovery.value
			? [
					...menu.value,
					{ id: 'claude-divider', isDivider: true as const },
					{ id: 'claude-mcp', title: entryLabel.value },
				]
			: menu.value,
	);
	function selectItem(id: string) {
		if (id === 'claude-mcp') {
			openEntry('create_menu');
		} else {
			void handleMenuSelect(id);
		}
	}
	return {
		claudeMenu,
		claudeAppendSlotName,
		selectItem,
		trackOpen: () => {
			if (showMcpDiscovery.value) mcpDiscovery.trackEntry('create_menu', 'viewed');
		},
	};
}
