<script setup lang="ts">
import { N8nEmptyState } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const i18n = useI18n();

const ResourcesListLayout = computed(() => componentRegistry.get('resources-list-layout'));
const ProjectHeader = computed(() => componentRegistry.get('project-header'));

const emptyStateIcon = {
	type: 'cards' as const,
	center: 'mcp',
	sides: ['workflow', 'plug'],
	animated: false,
};

async function initialize() {}
</script>

<template>
	<component
		:is="ResourcesListLayout"
		v-if="ResourcesListLayout"
		resource-key="mcpServers"
		tab-key="mcpServers"
		type="list-paginated"
		:resources="[]"
		:initialize="initialize"
		:loading="false"
		:disabled="false"
		:type-props="{ itemSize: 80 }"
		:has-empty-state="true"
		:shareable="false"
		:ui-config="{ searchEnabled: false, showFiltersDropdown: false, sortEnabled: false }"
	>
		<template #header>
			<component :is="ProjectHeader" v-if="ProjectHeader" />
		</template>
		<template #empty>
			<N8nEmptyState
				:icon="emptyStateIcon"
				:heading="i18n.baseText('mcpServers.empty.heading')"
				:description="i18n.baseText('mcpServers.empty.description')"
				data-test-id="mcp-servers-empty-state"
			/>
		</template>
	</component>
</template>
