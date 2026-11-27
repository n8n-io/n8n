<script setup lang="ts">
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

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

const i18n = useI18n();
</script>

<template>
	<div :class="[$style.title, { [$style.disabled]: disabled }]">
		<N8nText :class="$style.text" bold size="medium" color="text-dark">
			<label v-if="labelFor" :for="labelFor">{{ title }}</label>
			<template v-else>{{ title }}</template>
		</N8nText>
		<slot />
		<N8nTooltip
			v-if="tooltip || $slots.tooltip"
			as-child
			placement="top-start"
			:enterable="true"
			content-class="workflow-settings-tooltip"
		>
			<template #content>
				<span :class="$style.tooltipBody">
					<slot name="tooltip">{{ tooltip }}</slot>
				</span>
			</template>
			<!-- A button, so that keyboard focus opens the tooltip. -->
			<button
				type="button"
				:class="$style.help"
				:aria-label="i18n.baseText('workflowSettings.helpIcon.label', { interpolate: { title } })"
				data-test-id="workflow-settings-help-icon"
			>
				<N8nIcon icon="circle-help" />
			</button>
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

.tooltipBody {
	display: block;
	text-align: start;
}

:global(.n8n-tooltip.workflow-settings-tooltip) {
	max-width: 280px;
	align-items: flex-start;
	justify-content: flex-start;
	text-align: start;
	padding: var(--spacing--2xs) var(--spacing--xs);
}

// To keep the list quiet, the help icon is hidden until the pointer is on the title area,
// the icon has keyboard focus, or its tooltip is open.
.help {
	display: inline-flex;
	flex-shrink: 0;
	padding: 0;
	border: 0;
	background: none;
	color: inherit;
	cursor: default;
	opacity: 0;
	transition: opacity 0.3s ease;

	.title:hover &,
	&:focus-visible,
	&[data-state$='open'] {
		opacity: 1;
	}

	// A touch device has no pointer to reveal the icon.
	@media (hover: none) {
		opacity: 1;
	}
}
</style>
