<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';

const i18n = useI18n();
</script>

<template>
	<N8nTooltip placement="bottom">
		<template #content>
			<span v-n8n-html="i18n.baseText('node.thisIsATriggerNode')" />
		</template>
		<div :class="$style.triggerIcon">
			<FontAwesomeIcon icon="bolt" size="lg" />
		</div>
	</N8nTooltip>
</template>

<style lang="scss" module>
.triggerIcon {
	position: absolute;
	right: 100%;
	margin: auto;
	color: var(--color-primary);
	padding: var(--spacing-2xs);
}
</style>
