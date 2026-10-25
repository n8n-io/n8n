<script setup lang="ts">
import { N8nDropdownMenuItem } from '@n8n/design-system';
import type { VersionNode } from '@n8n/rest-api-client/api/versions';
import type { NodeDiffStatus } from 'n8n-workflow';
import { useId } from 'vue';

import type { SimplifiedNodeType } from '@/Interface';
import NodeIcon from '@/app/components/NodeIcon.vue';
import DiffBadge from '@/features/workflows/workflowDiff/DiffBadge.vue';

defineProps<{
	nodeType?: SimplifiedNodeType | VersionNode | null;
	nodeName?: string;
	badgeType?: NodeDiffStatus;
}>();

const emit = defineEmits<{
	select: [];
}>();

const itemId = useId();
</script>

<template>
	<!-- The list stays open so the user can select another change. -->
	<N8nDropdownMenuItem
		:id="itemId"
		:label="nodeName ?? ''"
		:close-on-select="false"
		@select="emit('select')"
	>
		<template #item-leading="{ ui }">
			<DiffBadge v-if="badgeType !== undefined" :type="badgeType" :class="ui.class" />
			<NodeIcon :node-type="nodeType" :size="16" :class="ui.class" />
		</template>
	</N8nDropdownMenuItem>
</template>
