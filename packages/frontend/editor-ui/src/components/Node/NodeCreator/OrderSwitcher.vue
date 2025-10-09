<script setup lang="ts">
import type { NodeFilterType } from '@/Interface';
import { REGULAR_NODE_CREATOR_VIEW } from '@/constants';

defineProps<{
	rootView: NodeFilterType;
}>();
</script>

<template>
	<div>
		<template v-if="rootView === REGULAR_NODE_CREATOR_VIEW">
			<slot name="actions" />
			<slot name="triggers" />
		</template>
		<template v-else>
			<slot name="triggers" />
			<slot name="actions" />
		</template>
	</div>
</template>
