<script setup lang="ts">
import { computed, onMounted } from 'vue';

type TagsSelectorProps = {
	inputs?: string[];
	columnView?: boolean;
};

const props = withDefaults(defineProps<TagsSelectorProps>(), {
	inputs: () => [],
	columnView: false,
});

const selectedItemsModel = defineModel<string[]>({ required: true });

const visibleTags = computed(() => {
	return props.inputs.filter((tag) => !selectedItemsModel.value.includes(tag));
});

function addToSelectedItems(name: string) {
	selectedItemsModel.value.push(name);
	selectedItemsModel.value.sort();
}

onMounted(() => {
	selectedItemsModel.value.sort();
});
</script>

<template>
	<div :class="$style.container">
		<span
			v-for="name in visibleTags"
			:key="name"
			:class="[$style.cell]"
			@click="addToSelectedItems(name)"
		>
			+ Add a {{ name }}
		</span>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	flex-wrap: wrap;
	display: flex;
}
.cell {
	display: flex;
	margin: var(--spacing-4xs) var(--spacing-3xs) 0 0;

	min-width: max-content;
	border-radius: var(--border-radius-base);
	font-size: small;
	background-color: var(--color-ndv-background);
	color: var(--text-color-dark);

	cursor: pointer;

	:hover {
		color: var(--color-primary);
	}
}
</style>
