<script lang="ts" setup>
import { N8nIcon, N8nIconButton, N8nTag } from '@n8n/design-system';
import { useTemplateRef } from 'vue';

const props = defineProps<{
	label: string;
	icon?: string;
	trailingIcon?: string;
	removable?: boolean;
	removeLabel?: string;
	testId?: string;
	removeTestId?: string;
}>();

const emit = defineEmits<{ remove: [] }>();
const rootRef = useTemplateRef<HTMLElement>('root');

defineExpose({ focus: () => rootRef.value?.focus() });
</script>

<template>
	<div ref="root" :class="$style.resourceChip" :data-test-id="props.testId">
		<N8nTag :text="props.label" :clickable="false" size="lg">
			<template #tag>
				<span :class="$style.content">
					<span v-if="$slots.icon" :class="$style.icon"><slot name="icon" /></span>
					<N8nIcon v-else-if="props.icon" :icon="props.icon" size="medium" :class="$style.icon" />
					<span :class="$style.label" :title="props.label">{{ props.label }}</span>
					<N8nIcon v-if="props.trailingIcon" :icon="props.trailingIcon" size="xsmall" />
				</span>
				<N8nIconButton
					v-if="props.removable"
					icon="x"
					size="xsmall"
					variant="ghost"
					:class="$style.remove"
					:title="props.removeLabel"
					:aria-label="props.removeLabel"
					:data-test-id="props.removeTestId"
					@keydown.stop
					@click.stop="emit('remove')"
				/>
			</template>
		</N8nTag>
	</div>
</template>

<style module lang="scss">
.resourceChip {
	--tag--min-width: 0;
	--tag--max-width: 100%;

	max-width: 100%;

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
		border-radius: var(--radius);
	}
}

.content {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	line-height: var(--line-height--xs);
	overflow: hidden;
}

.icon {
	flex-shrink: 0;
}

.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--xs);
}

.remove {
	flex: 0 0 auto;
	margin-right: calc(var(--spacing--2xs) * -1);
}
</style>
