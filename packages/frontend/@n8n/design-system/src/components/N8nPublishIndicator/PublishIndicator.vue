<script lang="ts" setup>
import { computed } from 'vue';

import N8nText from '../N8nText';

const props = withDefaults(
	defineProps<{
		status: 'published' | 'unpublished' | 'draft' | 'unpublishedDraft';
		variant?: 'dot' | 'badge';
	}>(),
	{
		variant: 'badge',
	},
);

defineEmits<{
	click: [event: MouseEvent];
}>();

const indicatorText = computed(() => {
	if (props.status === 'published' || props.status === 'unpublished') {
		return 'Published';
	}
	return 'Draft';
});

const unpublishedChanges = computed(() => {
	return props.status === 'unpublished' || props.status === 'unpublishedDraft';
});
</script>

<template>
	<div v-if="props.variant === 'badge'">
		<N8nText
			v-if="unpublishedChanges"
			size="small"
			color="text-light"
			:class="$style.indicatorChangesText"
			>Unpublished changes</N8nText
		>
		<div :class="$style.indicatorBadge" @click="$emit('click', $event)">
			<span
				:class="[
					$style.indicatorDot,
					{
						[$style.published]: props.status === 'published',
						[$style.unpublished]: unpublishedChanges,
					},
				]"
			/>
			<N8nText size="small" color="text-base" compact>{{ indicatorText }}</N8nText>
		</div>
	</div>
	<span
		v-else
		:class="[
			$style.indicatorDot,
			{
				[$style.published]: props.status === 'published',
				[$style.unpublished]: unpublishedChanges,
			},
		]"
	/>
</template>

<style module>
.indicatorDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	background-color: var(--color--foreground--shade-2);
	display: inline-block;
	margin-right: 8px;
}

.published {
	background-color: var(--color--mint-600);
}

.unpublished {
	background-color: var(--color--yellow-500);
}

.indicatorBadge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--sm);
	font-weight: 500;
	color: var(--color--text--base);
}

.indicatorChangesText {
	padding-right: var(--spacing--2xs);
}
</style>
