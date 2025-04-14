<script setup lang="ts">
import CommunityNodeInstallHint from '../Panel/CommunityNodeInstallHint.vue';
export interface Props {
	isPreview: boolean;
}

defineProps<Props>();
</script>

<template>
	<div>
		<CommunityNodeInstallHint v-if="isPreview" hint="Install this node to start using it" />

		<div v-else :class="$style.marginLeft">
			<n8n-button size="medium" type="secondary" icon="plus" label="Add to workflow" outline />
		</div>
	</div>
</template>

<style lang="scss" module>
.marginLeft {
	margin-left: var(--spacing-xs);
}
</style>
