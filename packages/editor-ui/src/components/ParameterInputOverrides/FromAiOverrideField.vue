<script setup lang="ts">
defineProps<{
	text: string;
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
		<N8nInput :model-value="text" :class="$style.overrideInput" disabled type="text" size="small" />
		<N8nIconButton
			v-if="!isReadOnly"
			type="tertiary"
			:class="['n8n-input', $style.overrideInput, $style.overrideCloseButton]"
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
