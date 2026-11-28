<script setup lang="ts">
import type { McpServerListItem } from '@n8n/api-types';
import { N8nBadge, N8nDropdownMenu, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useMcpServerItemsMenu } from '../composables/useMcpServerItemsMenu';

const MIN_ITEMS_FOR_SEARCH = 6;

const props = defineProps<{
	server: Pick<McpServerListItem, 'id' | 'projectId' | 'tools'>;
	dataTestId?: string;
}>();

const i18n = useI18n();
const { buildItemMenuItems, resolveItemMenuId, openServerItem } = useMcpServerItemsMenu();

const searchTerm = ref('');

const showSearch = computed(() => props.server.tools.length >= MIN_ITEMS_FOR_SEARCH);

const menuItems = computed(() => buildItemMenuItems(props.server.tools, searchTerm.value));

const tooltipText = computed(() => i18n.baseText('mcpServers.card.items.tooltip'));

function onSelect(value: string) {
	const item = resolveItemMenuId(props.server.tools, value);
	if (!item) return;
	openServerItem(props.server, item);
}

function onSearch(term: string) {
	searchTerm.value = term;
}

function onDropdownToggle(open: boolean) {
	if (!open) searchTerm.value = '';
}
</script>

<template>
	<N8nDropdownMenu
		:items="menuItems"
		placement="bottom-start"
		:searchable="showSearch"
		:search-placeholder="i18n.baseText('mcpServers.card.items.searchPlaceholder')"
		:max-height="280"
		:data-test-id="dataTestId"
		@select="onSelect"
		@search="onSearch"
		@update:model-value="onDropdownToggle"
	>
		<template #trigger>
			<N8nTooltip :content="tooltipText" placement="top" as-child>
				<N8nBadge variant="outline" clickable>
					<template #leading>
						<N8nIcon icon="graph-12" size="small" :class="$style.icon" />
					</template>
					{{ server.tools.length }}
				</N8nBadge>
			</N8nTooltip>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
/* Mirrors N8nBadge's leading icon, which only renders at 14px or larger. */
.icon {
	flex-shrink: 0;
	opacity: 0.9;
}
</style>
