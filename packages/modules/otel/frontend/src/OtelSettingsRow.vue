<script setup lang="ts">
import {
	N8nIcon,
	N8nSettingsRow,
	N8nText,
	N8nTooltip,
	type SettingsRowLayout,
} from '@n8n/design-system';

defineOptions({ inheritAttrs: false });

withDefaults(
	defineProps<{
		title: string;
		description: string;
		envTooltip?: string;
		layout?: SettingsRowLayout;
		actionFill?: boolean;
		actionMaxWidth?: string | false;
		descriptionError?: boolean;
	}>(),
	{
		envTooltip: undefined,
		layout: 'horizontal',
		actionFill: false,
		actionMaxWidth: '50%',
		descriptionError: false,
	},
);
</script>

<template>
	<N8nSettingsRow
		v-bind="$attrs"
		:layout="layout"
		:action-fill="actionFill"
		:action-max-width="actionMaxWidth"
	>
		<template #info>
			<div :class="$style.info">
				<div :class="$style.title">
					<N8nText bold size="medium" color="text-dark">
						{{ title }}
					</N8nText>
					<N8nTooltip v-if="envTooltip" :content="envTooltip" placement="top">
						<span :class="$style.envInfo" role="img" tabindex="0" :aria-label="envTooltip">
							<N8nIcon icon="circle-help" size="small" />
						</span>
					</N8nTooltip>
				</div>
				<N8nText
					size="small"
					:color="descriptionError ? 'danger' : 'text-light'"
					:data-test-id="descriptionError ? 'otel-settings-row-error' : undefined"
				>
					{{ description }}
				</N8nText>
			</div>
		</template>
		<template #action>
			<slot name="action" />
		</template>
	</N8nSettingsRow>
</template>

<style lang="scss" module>
.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.envInfo {
	display: inline-flex;
	align-items: center;
	color: var(--icon-color);
	border-radius: var(--radius--4xs);

	&:hover,
	&:focus-visible {
		color: var(--icon-color--strong);
	}

	&:focus-visible {
		outline: var(--border-width) solid var(--border-color--strong);
		outline-offset: var(--spacing--4xs);
	}
}
</style>
