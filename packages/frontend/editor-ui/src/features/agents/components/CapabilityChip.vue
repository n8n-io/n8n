<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		text: string;
		status?: 'neutral' | 'pass' | 'fail';
		icon?: IconName;
	}>(),
	{
		status: 'neutral',
		icon: undefined,
	},
);

const statusIcon = computed<IconName | undefined>(() => {
	if (props.status === 'pass') return 'circle-check';
	if (props.status === 'fail') return 'triangle-alert';
	return undefined;
});
</script>

<template>
	<div
		:class="[
			$style.chip,
			{
				[$style.pass]: props.status === 'pass',
				[$style.fail]: props.status === 'fail',
			},
		]"
	>
		<N8nIcon v-if="props.icon" :icon="props.icon" size="small" :class="$style.icon" />
		<N8nIcon
			v-else-if="statusIcon"
			:icon="statusIcon"
			size="small"
			:class="[$style.statusIcon, props.status === 'pass' ? $style.passIcon : $style.failIcon]"
		/>
		<N8nText size="small" color="text-dark" :class="$style.text">
			{{ props.text }}
		</N8nText>
		<N8nIcon
			v-if="props.icon && statusIcon"
			:icon="statusIcon"
			size="small"
			:class="[$style.statusIcon, props.status === 'pass' ? $style.passIcon : $style.failIcon]"
		/>
	</div>
</template>

<style module lang="scss">
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: light-dark(var(--background--surface), var(--background--subtle));
	box-shadow: var(--shadow--xs);
}

.pass {
	border-color: var(--color--success);
}

.fail {
	border-color: var(--color--danger);
}

.icon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.text {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--font-weight--medium);
}

.statusIcon {
	flex-shrink: 0;
}

.passIcon {
	color: var(--color--success);
}

.failIcon {
	color: var(--color--danger);
}
</style>
