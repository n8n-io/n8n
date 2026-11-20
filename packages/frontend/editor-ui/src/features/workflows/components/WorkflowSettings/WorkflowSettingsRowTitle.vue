<script setup lang="ts">
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';

type WorkflowSettingsRowTitleProps = {
	title: string;
	/** Help text for the tooltip. Use the `tooltip` slot for rich content. */
	tooltip?: string;
	disabled?: boolean;
	/** The id of the control that this title labels. A click on the title then activates it. */
	labelFor?: string;
};

defineProps<WorkflowSettingsRowTitleProps>();

defineSlots<{
	/** Content between the title and the help icon, for example a badge. */
	default?: () => unknown;
	tooltip?: () => unknown;
}>();
</script>

<template>
	<div :class="[$style.title, { [$style.disabled]: disabled }]">
		<N8nText :class="$style.text" bold size="medium" color="text-dark">
			<label v-if="labelFor" :for="labelFor">{{ title }}</label>
			<template v-else>{{ title }}</template>
		</N8nText>
		<slot />
		<N8nTooltip v-if="tooltip || $slots.tooltip" placement="top" :enterable="true">
			<template #content>
				<slot name="tooltip">{{ tooltip }}</slot>
			</template>
			<N8nIcon :class="$style.icon" icon="circle-help" data-test-id="workflow-settings-help-icon" />
		</N8nTooltip>
	</div>
</template>

<style module lang="scss">
.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.disabled {
	opacity: 0.5;
}

.text {
	min-width: 0;
	overflow-wrap: anywhere;
}

// The help icon shows only when the pointer is on the title area, to keep the list quiet.
.icon {
	flex-shrink: 0;
	opacity: 0;
	transition: opacity 0.3s ease;

	.title:hover &,
	&:focus-visible {
		opacity: 1;
	}
}
</style>
