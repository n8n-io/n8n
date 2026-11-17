<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		title: string;
		description: string;
		itemCount: number;
		/** Accessible label and tooltip for the add button when the group has items. */
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
}>();

const emit = defineEmits<{
	add: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.group" :inert="props.disabled || undefined">
		<div :class="$style.header">
			<div :class="$style.heading">
				<N8nText bold>{{ props.title }}</N8nText>
				<N8nText color="text-light">{{ props.description }}</N8nText>
			</div>

			<N8nButton
				v-if="props.itemCount === 0"
				variant="ghost"
				size="medium"
				icon="plus"
				:disabled="props.disabled"
				:data-testid="props.addButtonTestId"
				:aria-label="props.addLabel"
				@click="emit('add')"
			>
				{{ i18n.baseText('generic.add') }}
			</N8nButton>
		</div>

		<div v-if="props.itemCount > 0" :class="$style.chips">
			<slot />

			<N8nTooltip :content="props.addLabel" placement="top">
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
		</div>
	</div>
</template>

<style module lang="scss">
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--spacing--xl);
}

.heading {
	display: flex;
	flex: 1 1 0;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: min(100%, 16rem);
}

.chips {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	min-width: 0;
}
</style>
