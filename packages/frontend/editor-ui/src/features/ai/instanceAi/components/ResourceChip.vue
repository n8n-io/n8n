<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';

const props = defineProps<{
	type: 'workflow' | 'credential' | 'data-table';
	resourceId: string;
	name: string;
}>();

const iconMap: Record<string, IconName> = {
	workflow: 'workflow',
	credential: 'key-round',
	'data-table': 'table',
};

const urlMap: Record<string, (id: string) => string> = {
	workflow: (id) => `/workflow/${id}`,
	credential: () => '/credentials',
	'data-table': () => '/data-tables',
};

const icon = computed(() => iconMap[props.type] ?? 'file');
const href = computed(() => urlMap[props.type]?.(props.resourceId) ?? '#');
</script>

<template>
	<a
		:href="href"
		target="_blank"
		rel="noopener noreferrer"
		:class="$style.chip"
		:title="props.name"
	>
		<N8nIcon :icon="icon" size="small" />
		<span>{{ props.name }}</span>
	</a>
</template>

<style lang="scss" module>
.chip {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	padding: 1px var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	background: var(--color--background--shade-1);
	border: var(--border);
	border-radius: var(--radius);
	color: var(--color--primary);
	text-decoration: none;
	cursor: pointer;
	vertical-align: baseline;
	line-height: var(--line-height--md);

	&:hover {
		background: color-mix(in srgb, var(--color--primary) 12%, var(--color--background));
		border-color: var(--color--primary);
	}
}
</style>
