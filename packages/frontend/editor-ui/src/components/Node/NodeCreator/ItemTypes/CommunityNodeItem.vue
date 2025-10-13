<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import CommunityNodeInstallHint from '../Panel/CommunityNodeInstallHint.vue';
import { N8nButton } from '@n8n/design-system';
export interface Props {
	isPreview: boolean;
}

defineProps<Props>();

const i18n = useI18n();
</script>

<template>
	<div>
		<CommunityNodeInstallHint
			v-if="isPreview"
			:hint="i18n.baseText('communityNodeItem.node.hint')"
		/>

		<div v-else :class="$style.marginLeft">
			<N8nButton
				size="medium"
				type="secondary"
				icon="plus"
				:label="i18n.baseText('communityNodeItem.label')"
				outline
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.marginLeft {
	margin-left: var(--spacing--xs);
}
</style>
