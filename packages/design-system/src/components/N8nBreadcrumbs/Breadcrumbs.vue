<script lang="ts" setup>
import { computed, ref } from 'vue';

import type { Icon } from '../N8nIconPicker/IconPicker.vue';

export type PathItem = {
	id: string;
	label: string;
	type: 'item' | 'ellipsis';
	href?: string;
	icon?: Icon;
};

type Props = {
	items: PathItem[];
	asyncPathHandler?: () => Promise<PathItem[]>;
	visibleLevels?: number;
	showRoot?: boolean;
	theme: 'small' | 'medium';
	showBorder?: boolean;
};

defineOptions({ name: 'N8nBreadcrumbs' });

const props = withDefaults(defineProps<Props>(), {
	visibleLevels: 3,
	theme: 'medium',
	showRoot: true,
	showBorder: true,
	asyncPathHandler: undefined,
});

const fullPath = ref<PathItem[]>([]);

const tooltipText = computed(() => {
	return props.items.map((item) => item.label).join(' / ');
});
</script>
<template>
	<div :class="$style.container">
		<ul :class="$style.list">
			<template v-for="(item, index) in items" :key="item.id">
				<li v-if="item.type === 'item'">
					<n8n-link v-if="item.href" :href="item.href" theme="text">{{ item.label }}</n8n-link>
					<n8n-text v-else>{{ item.label }}</n8n-text>
				</li>
				<li v-else-if="item.type === 'ellipsis'" :class="$style.ellipsis">
					<n8nTooltip :content="tooltipText">
						<n8n-text>...</n8n-text>
					</n8nTooltip>
				</li>
				<li v-if="index !== items.length - 1" class="separator" aria-hidden="true">/</li>
			</template>
		</ul>
	</div>
</template>
<style lang="scss" module>
.container {
	display: flex;
}

.list {
	display: flex;
	list-style: none;
	padding: 0;
	margin: 0;
	gap: var(--spacing-4xs);

	li {
		color: var(--color-text-base);
		padding: var(--spacing-5xs);
	}

	.ellipsis {
		cursor: pointer;
	}
}
</style>
