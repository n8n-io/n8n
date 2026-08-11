<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import { N8nButton, N8nDropdownMenu, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import OtelStatusDot from './OtelStatusDot.vue';

/*
 * Asymmetric-risk status control (mirrors the MCP settings page): enabling is
 * low-stakes and takes one click; disabling is deliberately one step removed
 * behind the enabled-state dropdown, styled as a danger action.
 */
withDefaults(
	defineProps<{
		enabled: boolean;
		disabled?: boolean;
		loading?: boolean;
	}>(),
	{
		disabled: false,
		loading: false,
	},
);

const emit = defineEmits<{
	'update:enabled': [enabled: boolean];
}>();

const i18n = useI18n();
const $style = useCssModule();

const menuItems = computed(() => [
	{
		id: 'disable',
		label: i18n.baseText('settings.opentelemetry.enable.action.disable'),
		icon: { type: 'icon', value: 'power' } as const,
		class: $style.dangerItem,
	},
]);

function onSelect(id: string) {
	if (id === 'disable') {
		emit('update:enabled', false);
	}
}
</script>

<template>
	<N8nDropdownMenu
		v-if="enabled"
		:items="menuItems"
		placement="bottom-end"
		:disabled="disabled || loading"
		data-test-id="otel-enabled-menu"
		@select="onSelect"
	>
		<template #trigger>
			<N8nButton
				variant="outline"
				size="medium"
				:disabled="disabled"
				:loading="loading"
				:aria-label="i18n.baseText('settings.opentelemetry.enable.action.enabledAriaLabel')"
				data-test-id="otel-enabled-toggle"
			>
				<OtelStatusDot />
				{{ i18n.baseText('settings.opentelemetry.enable.option.enabled') }}
				<N8nIcon icon="chevron-down" size="small" />
			</N8nButton>
		</template>
	</N8nDropdownMenu>

	<N8nButton
		v-else
		variant="outline"
		size="medium"
		:disabled="disabled"
		:loading="loading"
		:aria-label="i18n.baseText('settings.opentelemetry.enable.action.enableAriaLabel')"
		data-test-id="otel-enabled-toggle"
		@click="emit('update:enabled', true)"
	>
		{{ i18n.baseText('settings.opentelemetry.enable.action.enable') }}
	</N8nButton>
</template>

<style lang="scss" module>
/*
 * Destructive menu item: native at rest and on hover (standard hover surface),
 * except the label and icon turn the design system's danger colors.
 */
.dangerItem:not([data-disabled]) {
	&:hover,
	&[data-highlighted],
	&[aria-selected='true'] {
		span {
			color: var(--color--text--danger);
		}

		// N8nIcon applies its color prop as an inline style, which only
		// !important can override. Same token as the label so they read as one.
		svg {
			color: var(--color--text--danger) !important;
		}
	}
}
</style>
