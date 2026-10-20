<script setup lang="ts">
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nStatusDot } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

/**
 * The "Enabled" button of the SCIM status row. The dot shows where the
 * connection stands. The menu holds the one way to turn SCIM off.
 */
const props = withDefaults(
	defineProps<{
		variant: 'success' | 'warning' | 'danger';
		pulse?: boolean;
		disabled?: boolean;
	}>(),
	{ pulse: false, disabled: false },
);

const emit = defineEmits<{
	disable: [];
}>();

const i18n = useI18n();

const items = computed<Array<DropdownMenuItemProps<'disable'>>>(() => [
	{
		id: 'disable',
		label: i18n.baseText('settings.scim.status.disable'),
		icon: { type: 'icon', value: 'power' },
		destructive: true,
	},
]);

function onSelect(id: 'disable') {
	if (id === 'disable') emit('disable');
}
</script>

<template>
	<N8nDropdownMenu
		:items="items"
		placement="bottom-end"
		data-test-id="scim-status-menu"
		@select="onSelect"
	>
		<template #trigger>
			<N8nButton
				variant="outline"
				size="medium"
				:disabled="props.disabled"
				:aria-label="i18n.baseText('settings.scim.status.manage')"
				data-test-id="scim-status-button"
			>
				<span :class="$style.label">
					<N8nStatusDot
						:variant="props.variant"
						:pulse="props.pulse"
						data-test-id="scim-status-dot"
					/>
					{{ i18n.baseText('settings.scim.status.enabled') }}
					<N8nIcon icon="chevron-down" size="small" />
				</span>
			</N8nButton>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.label {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
