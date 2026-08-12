<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nActionDropdown, N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';

export type SelectionBarAction = {
	id: string;
	label: string;
	destructive?: boolean;
};

interface Props {
	selectedCount: number;
	/**
	 * When provided, the component renders a single "Bulk actions" dropdown
	 * listing all actions and emits `action` with the chosen id. When omitted,
	 * the legacy `actions` slot / default Delete button is used instead.
	 */
	actions?: SelectionBarAction[];
	selectedText?: string;
	noActionsText?: string;
	noActionsTooltip?: string;
}

const props = withDefaults(defineProps<Props>(), {
	actions: undefined,
	selectedText: undefined,
	noActionsText: undefined,
	noActionsTooltip: undefined,
});

const emit = defineEmits<{
	deleteSelected: [];
	clearSelection: [];
	action: [id: string];
}>();

const i18n = useI18n();

const usesActionsApi = computed(() => props.actions !== undefined);

const selectedText = computed(
	() =>
		props.selectedText ??
		i18n.baseText('generic.list.selected', {
			adjustToNumber: props.selectedCount,
			interpolate: { count: `${props.selectedCount}` },
		}),
);

const clearSelectionText = computed(() => i18n.baseText('generic.list.clearSelection'));

const bulkActionsText = computed(() => i18n.baseText('generic.list.bulkActions'));

const hasNoActions = computed(() => usesActionsApi.value && (props.actions ?? []).length === 0);

// Every action lives in the "Bulk actions" dropdown: non-destructive first,
// then a divider before the danger group.
const actionItems = computed<Array<ActionDropdownItem<string>>>(() => {
	const nonDestructive = (props.actions ?? []).filter((a) => !a.destructive);
	const destructive = (props.actions ?? []).filter((a) => a.destructive);
	return [
		...nonDestructive.map((a) => ({ id: a.id, label: a.label })),
		...destructive.map((a, index) => ({
			id: a.id,
			label: a.label,
			variant: 'destructive' as const,
			divided: index === 0 && nonDestructive.length > 0,
		})),
	];
});

const handleDeleteSelected = () => emit('deleteSelected');
const handleClearSelection = () => emit('clearSelection');
const handleAction = (id: string) => emit('action', id);
</script>

<template>
	<div
		v-if="selectedCount > 0"
		:class="$style.selectionOptions"
		:data-test-id="`selected-items-info`"
	>
		<span>{{ selectedText }}</span>

		<!-- Actions API: buttons + overflow -->
		<template v-if="usesActionsApi">
			<N8nTooltip v-if="hasNoActions" :disabled="!noActionsTooltip" placement="top">
				<template #content>{{ noActionsTooltip }}</template>
				<N8nText size="small" color="text-light" data-test-id="selection-no-actions">
					{{ noActionsText }}
				</N8nText>
			</N8nTooltip>
			<N8nActionDropdown
				v-else
				:items="actionItems"
				placement="top-start"
				data-test-id="selection-bulk-actions"
				@select="handleAction"
			>
				<template #activator>
					<N8nButton variant="subtle" :class="$style.button">
						{{ bulkActionsText }}
						<N8nIcon icon="chevron-down" :class="$style.caret" />
					</N8nButton>
				</template>
			</N8nActionDropdown>
		</template>

		<!-- Legacy: custom slot, defaults to Delete button -->
		<slot v-else name="actions">
			<N8nButton
				variant="subtle"
				data-test-id="delete-selected-button"
				:label="i18n.baseText('generic.delete')"
				:class="$style.button"
				@click="handleDeleteSelected"
			/>
		</slot>

		<N8nButton
			variant="subtle"
			data-test-id="clear-selection-button"
			:label="clearSelectionText"
			:class="$style.button"
			@click="handleClearSelection"
		/>
	</div>
</template>

<style module lang="scss">
.selectionOptions {
	display: flex;
	align-items: center;
	position: absolute;
	padding: var(--spacing--2xs);
	z-index: 2;
	left: 50%;
	transform: translateX(-50%);
	bottom: var(--spacing--3xl);
	background: var(--execution-selector--color--background);
	border-radius: var(--radius);
	color: var(--execution-selector--color--text);
	font-size: var(--font-size--2xs);
	gap: var(--spacing--2xs);
}

.button {
	display: flex;
	align-items: center;
}

.caret {
	margin-left: var(--spacing--4xs);
}
</style>
