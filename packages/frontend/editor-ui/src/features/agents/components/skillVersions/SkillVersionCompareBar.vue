<script setup lang="ts" generic="T extends string | number">
import { N8nButton, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	/** Both selects offer the same choices. */
	options: Array<{ value: T; label: string }>;
}>();

const from = defineModel<T>('from', { required: true });
const to = defineModel<T>('to', { required: true });

defineSlots<{
	/** Extra controls at the right end of the bar. */
	default?: () => unknown;
}>();

const i18n = useI18n();

// The select emits an untyped value. Map it back to one of the options.
function onSelect(side: 'from' | 'to', value: unknown) {
	const option = props.options.find((candidate) => candidate.value === value);
	if (!option) return;
	if (side === 'from') from.value = option.value;
	else to.value = option.value;
}

function onSwap() {
	[from.value, to.value] = [to.value, from.value];
}
</script>

<template>
	<div :class="$style.bar" data-testid="skill-version-compare-bar">
		<N8nText size="small" color="text-light">
			{{ i18n.baseText('settings.context.skills.versions.compare.title') }}
		</N8nText>
		<N8nSelect
			:model-value="from"
			size="small"
			:teleported="false"
			:class="$style.select"
			:aria-label="i18n.baseText('settings.context.skills.versions.compare.from')"
			data-testid="skill-version-compare-from"
			@update:model-value="onSelect('from', $event)"
		>
			<N8nOption
				v-for="option in options"
				:key="option.value"
				:value="option.value"
				:label="option.label"
			/>
		</N8nSelect>
		<N8nIcon icon="arrow-right" size="small" color="text-light" />
		<N8nSelect
			:model-value="to"
			size="small"
			:teleported="false"
			:class="$style.select"
			:aria-label="i18n.baseText('settings.context.skills.versions.compare.to')"
			data-testid="skill-version-compare-to"
			@update:model-value="onSelect('to', $event)"
		>
			<N8nOption
				v-for="option in options"
				:key="option.value"
				:value="option.value"
				:label="option.label"
			/>
		</N8nSelect>
		<N8nButton
			variant="outline"
			size="small"
			data-testid="skill-version-compare-swap"
			@click="onSwap"
		>
			<template #icon><N8nIcon icon="arrow-left-right" size="small" /></template>
			{{ i18n.baseText('settings.context.skills.versions.compare.swap') }}
		</N8nButton>
		<template v-if="$slots.default">
			<span :class="$style.spacer" />
			<slot />
		</template>
	</div>
</template>

<style lang="scss" module>
.bar {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

/* The Design System has no width token for a select. 14rem fits "v12 · a short name (latest)". */
.select {
	width: 14rem;
}

.spacer {
	flex: 1;
}
</style>
