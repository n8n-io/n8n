<script lang="ts" setup>
import { computed, onUnmounted, ref } from 'vue';

import N8nIcon from './Icon.vue';
import { updatedIconSet, type IconName } from './icons';
import type { IconColor, IconSize } from '../../types/icon';
import N8nInput from '../N8nInput/Input.vue';
import N8nText from '../N8nText/Text.vue';

/** Storybook-only catalog for browsing `updatedIconSet`. */
defineOptions({ name: 'IconGallery' });

withDefaults(
	defineProps<{
		size?: IconSize | number;
		color?: IconColor;
		spin?: boolean;
		strokeWidth?: number;
	}>(),
	{
		size: 'large',
		color: undefined,
		spin: false,
		strokeWidth: undefined,
	},
);

const COPY_RESET_MS = 1500;
const allIconNames = (Object.keys(updatedIconSet) as IconName[]).toSorted((a, b) =>
	a.localeCompare(b),
);

const query = ref('');
const copiedName = ref<IconName | null>(null);
let copyTimeout: ReturnType<typeof setTimeout> | undefined;

const icons = computed(() => {
	const normalizedQuery = query.value.trim().toLowerCase();
	if (!normalizedQuery) {
		return allIconNames;
	}

	return allIconNames.filter((name) => name.includes(normalizedQuery));
});

const copyName = async (name: IconName) => {
	try {
		await navigator.clipboard.writeText(name);
	} catch {
		return;
	}

	copiedName.value = name;

	if (copyTimeout) {
		clearTimeout(copyTimeout);
	}

	copyTimeout = setTimeout(() => {
		if (copiedName.value === name) {
			copiedName.value = null;
		}
	}, COPY_RESET_MS);
};

onUnmounted(() => {
	if (copyTimeout) {
		clearTimeout(copyTimeout);
	}
});
</script>

<template>
	<div :class="$style.gallery">
		<form :class="$style.toolbar" @submit.prevent>
			<N8nInput
				v-model="query"
				:class="$style.search"
				size="small"
				placeholder="Search icons"
				clearable
				autocomplete="off"
				aria-label="Search icons"
			>
				<template #prefix>
					<N8nIcon icon="search" size="small" />
				</template>
			</N8nInput>
			<N8nText size="small" color="text-light">
				{{ icons.length }} / {{ allIconNames.length }}
			</N8nText>
		</form>

		<div v-if="icons.length" :class="$style.grid">
			<button
				v-for="name in icons"
				:key="name"
				type="button"
				:class="$style.tile"
				:aria-label="`Copy ${name}`"
				:title="name"
				@click="copyName(name)"
			>
				<N8nIcon
					:icon="name"
					:size="size"
					:color="color"
					:spin="spin"
					:stroke-width="strokeWidth"
				/>
				<N8nText :class="$style.label" size="xsmall" color="text-light">
					{{ copiedName === name ? 'Copied' : name }}
				</N8nText>
			</button>
		</div>
		<N8nText v-else size="small" color="text-light">No icons match "{{ query }}"</N8nText>
	</div>
</template>

<style lang="scss" module>
.gallery {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
	color: var(--text-color);
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	width: 100%;
	max-width: calc(var(--spacing--5xl) * 2);
}

.search {
	flex: 1 1 var(--spacing--5xl);
	min-width: 0;
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(var(--spacing--4xl), 1fr));
	gap: var(--spacing--2xs);
}

.tile {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	min-block-size: var(--spacing--4xl);
	padding: var(--spacing--xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	color: inherit;
	cursor: pointer;
	user-select: none;

	@media (hover: hover) {
		&:hover {
			background: var(--background--hover);
		}
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: var(--spacing--5xs);
	}
}

.label {
	max-width: 100%;
	overflow: hidden;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
