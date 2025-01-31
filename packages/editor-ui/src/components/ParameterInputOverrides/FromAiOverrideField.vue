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
	<div :class="$style.contentOverrideContainer">
		<div :class="[$style.iconStars, 'el-input-group__prepend', $style.noCornersRight]">
			<AiStarsIcon :class="$style.aiStarsIcon" />
		</div>
		<div :class="['flex-grow', $style.overrideInput]">
			<N8nText color="text-dark" size="small">{{
				i18n.baseText('parameterOverride.overridePanelText')
			}}</N8nText>
			<N8nText color="text-dark" size="small" bold>{{
				i18n.baseText('parameterOverride.overridePanelTextModel')
			}}</N8nText>
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
	flex-grow: 1;

	* > input {
		padding-left: 0;
		// We need this in light mode
		background-color: var(--color-foreground-base) !important;
		border: none;
	}
}

.overrideCloseButton {
	padding: 0px 8px 3px; // the icon used is off-center vertically
	border: 0px;
	color: var(--color-text-base);
	--button-hover-background-color: transparent;
	--button-active-background-color: transparent;
}

.contentOverrideContainer {
	display: flex;
	gap: var(--spacing-4xs);
	border-radius: var(--border-radius-base);
	background-color: var(--color-foreground-base);
}
</style>
