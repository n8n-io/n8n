<script setup lang="ts">
import { i18n } from '@/plugins/i18n';

defineProps<{
	isReadOnly?: boolean;
}>();

const emit = defineEmits<{
	close: [];
}>();
</script>

<template>
	<div :class="$style.contentOverrideContainer" data-test-id="fromAI-override-field">
		<div :class="[$style.iconStars, 'el-input-group__prepend', $style.noCornersRight]">
			<AiStarsIcon :class="$style.aiStarsIcon" />
		</div>
		<div :class="$style.overrideInput">
			<N8nText
				v-n8n-html="i18n.baseText('parameterOverride.overridePanelText')"
				color="text-dark"
				size="small"
			/>
		</div>
		<N8nIconButton
			v-if="!isReadOnly"
			type="tertiary"
			:class="['n8n-input', $style.overrideCloseButton]"
			outline="false"
			icon="xmark"
			size="xsmall"
			@click="emit('close')"
		/>
	</div>
</template>

<style lang="scss" module>
.iconStars {
	align-self: center;
	padding-left: 8px;
	width: 22px;
	text-align: center;
	border: none;
	color: var(--color-foreground-xdark);
	background-color: var(--color-foreground-base);
}

.noCornersRight {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.overrideInput {
	height: 30px;
	align-content: center;
	overflow: hidden;
	text-overflow: ellipsis;
}

.overrideCloseButton {
	padding: 0px 8px 3px; // the icon used is off-center vertically
	border: 0px;
	color: var(--color-text-base);
	margin-left: auto;
	--button-hover-background-color: transparent;
	--button-active-background-color: transparent;
}

.contentOverrideContainer {
	display: flex;
	white-space: nowrap;
	width: 100%;
	gap: var(--spacing-4xs);
	border-radius: var(--border-radius-base);
	background-color: var(--color-foreground-base);
}
</style>
