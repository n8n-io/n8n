<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nTooltip, N8nText } from '@n8n/design-system';

defineProps<{
	isTemplateDemoMode: boolean;
	isCanvasInteractable: boolean;
	hideDemoTooltip: boolean;
}>();

const i18n = useI18n();
</script>

<template>
	<N8nTooltip
		:visible="
			isTemplateDemoMode &&
			isCanvasInteractable /** this happens to match showing an overlay which is what we care about */ &&
			!hideDemoTooltip
		"
		placement="top"
		popper-class="$style.customTooltipWidth"
	>
		<template #content>
			<N8nText :bold="true" size="small">{{
				i18n.baseText('template.readyToDemo.tooltip.title')
			}}</N8nText>
			<div
				v-n8n-html="i18n.baseText('template.readyToDemo.tooltip.content')"
				:class="$style.demoTemplateContent"
			/>
		</template>
		<slot />
	</N8nTooltip>
</template>

<style lang="scss" module>
.demoTemplateContent {
	padding-top: 4px;
	line-height: 16px;
}

.el-popper.custom-tooltip-width {
	padding: 0;
	max-width: 290px;
	width: auto;
}
</style>
