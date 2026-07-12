<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		/** User cannot toggle MCP (member, or setting managed by env). */
		disabled?: boolean;
		loading?: boolean;
		managedByEnv?: boolean;
	}>(),
	{ disabled: false, loading: false, managedByEnv: false },
);

const emit = defineEmits<{ disable: [] }>();

const i18n = useI18n();

const disabledTooltip = computed(() =>
	props.managedByEnv
		? i18n.baseText('settings.mcp.managedByEnv.tooltip')
		: i18n.baseText('settings.mcp.toggle.disabled.tooltip'),
);

const menuItems = computed(() => [
	{
		id: 'disable',
		label: i18n.baseText('settings.mcp.status.disable'),
		icon: { type: 'icon' as const, value: 'power' as const },
	},
]);

const onSelect = (id: string) => {
	if (id === 'disable') emit('disable');
};
</script>

<template>
	<N8nTooltip :content="disabledTooltip" :disabled="!props.disabled" placement="top">
		<N8nDropdownMenu
			:items="menuItems"
			placement="bottom-end"
			:disabled="props.disabled || props.loading"
			data-test-id="mcp-status-control"
			@select="onSelect"
		>
			<template #trigger>
				<N8nButton
					variant="outline"
					size="medium"
					:disabled="props.disabled"
					:loading="props.loading"
					:aria-label="i18n.baseText('settings.mcp.status.ariaLabel')"
					data-test-id="mcp-status-control-trigger"
				>
					<span :class="$style.dot" />
					{{ i18n.baseText('settings.mcp.header.toggle.enabled') }}
					<N8nIcon icon="chevron-down" size="small" />
				</N8nButton>
			</template>
			<template #item-leading>
				<N8nIcon icon="power" size="large" color="danger" />
			</template>
			<template #item-label="{ item }">
				<N8nText size="medium" color="danger" data-test-id="mcp-status-disable-item">
					{{ item.label }}
				</N8nText>
			</template>
		</N8nDropdownMenu>
	</N8nTooltip>
</template>

<style lang="scss" module>
.dot {
	width: 8px;
	height: 8px;
	flex-shrink: 0;
	border-radius: 50%;
	background-color: var(--color--success);
	animation: mcp-status-pulse 2s ease-in-out infinite;
}

@keyframes mcp-status-pulse {
	50% {
		opacity: 0.4;
	}
}

@media (prefers-reduced-motion: reduce) {
	.dot {
		animation: none;
	}
}
</style>
