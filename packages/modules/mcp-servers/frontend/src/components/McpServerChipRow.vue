<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';

// One chip row of a panel, matching AgentChipRow in the agent builder.
const props = withDefaults(
	defineProps<{
		label: string;
		itemCount: number;
		addLabel: string;
		addButtonTestId?: string;
		addButtonAttr?: string;
		disabled?: boolean;
		showLabel?: boolean;
		/** Hides the add button, for read-only viewers. */
		hideAdd?: boolean;
	}>(),
	{
		addButtonTestId: undefined,
		addButtonAttr: undefined,
		disabled: false,
		showLabel: true,
		hideAdd: false,
	},
);

defineSlots<{
	default?: () => unknown;
}>();

const emit = defineEmits<{
	add: [];
}>();
</script>

<template>
	<div :class="$style.row">
		<N8nText v-if="props.showLabel && props.itemCount > 0" bold :class="$style.label">
			{{ props.label }}
		</N8nText>

		<div :class="$style.content">
			<div :class="$style.chips">
				<div :class="$style.existingChips" :inert="props.disabled || undefined">
					<slot />
				</div>

				<template v-if="props.hideAdd" />
				<N8nTooltip
					v-else-if="props.itemCount > 0"
					as-child
					:content="props.addLabel"
					placement="top"
				>
					<N8nButton
						variant="ghost"
						size="medium"
						icon-only
						:aria-label="props.addLabel"
						:disabled="props.disabled"
						focusable-when-disabled
						:data-test-id="props.addButtonTestId"
						:data-attr="props.addButtonAttr"
						@click="emit('add')"
					>
						<template #icon>
							<N8nIcon icon="plus" :size="16" color="text-light" />
						</template>
					</N8nButton>
				</N8nTooltip>

				<N8nButton
					v-else
					:class="$style.emptyAddButton"
					variant="ghost"
					size="medium"
					:disabled="props.disabled"
					:data-test-id="props.addButtonTestId"
					:data-attr="props.addButtonAttr"
					@click="emit('add')"
				>
					<template #icon>
						<N8nIcon icon="plus" :size="16" />
					</template>
					{{ props.addLabel }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.label {
	--mcp-server-chip-row--label-width: max(7%, calc(var(--spacing--3xl) + var(--spacing--sm)));
	flex: 0 0 var(--mcp-server-chip-row--label-width);
	line-height: var(--line-height--sm);
	margin-top: var(--spacing--3xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	flex: 1;
	min-width: 0;
}

.chips {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.existingChips {
	display: contents;
}

.emptyAddButton {
	--button--color: var(--text-color--subtler);
	margin-inline-start: calc(-1 * var(--spacing--xs));
	margin-top: calc(-1 * var(--spacing--4xs));

	&:hover:not(:disabled) {
		--button--color: var(--text-color);
		background-color: transparent;
	}
}

@container mcp-server-editor (max-width: 48rem) {
	.row {
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	.label {
		flex-basis: auto;
	}
}
</style>
