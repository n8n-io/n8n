<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		label: string;
		itemCount: number;
		addLabel: string;
		addButtonTestId?: string;
		disabled?: boolean;
	}>(),
	{
		addButtonTestId: undefined,
		disabled: false,
	},
);

defineSlots<{
	default?: () => unknown;
	extra?: () => unknown;
}>();

const emit = defineEmits<{
	add: [];
}>();
</script>

<template>
	<div :class="$style.row" :inert="props.disabled || undefined">
		<N8nText v-if="props.itemCount > 0" bold :class="$style.label">
			{{ props.label }}
		</N8nText>

		<div :class="$style.content">
			<div :class="$style.chips">
				<slot />

				<N8nTooltip v-if="props.itemCount > 0" :content="props.addLabel" placement="top">
					<N8nButton
						variant="ghost"
						size="medium"
						icon-only
						:aria-label="props.addLabel"
						:disabled="props.disabled"
						:data-testid="props.addButtonTestId"
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
					:data-testid="props.addButtonTestId"
					@click="emit('add')"
				>
					{{ props.addLabel }}
				</N8nButton>
			</div>

			<div v-if="$slots.extra" :class="$style.extra">
				<slot name="extra" />
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.label {
	--n8n--row-label-width: max(7%, calc(var(--spacing--3xl) + var(--spacing--sm)));
	flex: 0 0 var(--n8n--row-label-width);
	line-height: var(--line-height--sm);
	margin-top: var(--spacing--3xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.chips {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.emptyAddButton {
	--button--color: var(--text-color--subtler);
	margin-left: calc(-1 * var(--spacing--xs));
	margin-top: calc(-1 * var(--spacing--4xs));
}

.extra {
	min-width: 0;
}

@media (max-width: 768px) {
	.row {
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	.label {
		flex-basis: auto;
		line-height: var(--line-height--sm);
	}
}
</style>
