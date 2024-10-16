<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

type Size = {
	rem: string;
	px: number;
};

// Define props with their types
const props = withDefaults(
	defineProps<{
		variables: string[];
		attr?: string;
	}>(),
	{
		attr: '',
	},
);

const getSizes = () => {
	const style = getComputedStyle(document.body);

	const sizeByVariableName: Record<string, Size> = {};
	for (const variable of props.variables) {
		const rem = style.getPropertyValue(variable);
		const px = parseFloat(rem.replace('rem', '')) * 16; // Assuming default font-size is 16px

		sizeByVariableName[variable] = { rem, px };
	}

	return sizeByVariableName;
};

const sizes = ref<Record<string, Size>>(getSizes());
const observer = ref<MutationObserver | null>(null);

onMounted(() => {
	// Observing attributes changes in body to recompute sizes
	const mutationObserverCallback = (mutationsList: MutationRecord[]) => {
		for (const mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				sizes.value = getSizes();
			}
		}
	};

	const body = document.querySelector('body');
	if (body) {
		observer.value = new MutationObserver(mutationObserverCallback);
		observer.value.observe(body, { attributes: true });
	}
});

onUnmounted(() => {
	observer.value?.disconnect();
});
</script>

<template>
	<table :class="$style.table">
		<tr>
			<th :class="$style.row">Name</th>
			<th :class="$style.row">rem</th>
			<th :class="$style.row">px</th>
		</tr>
		<tr
			v-for="variable in variables"
			:key="variable"
			:style="attr ? { [attr]: `var(${variable})` } : {}"
		>
			<td>{{ variable }}</td>
			<td>{{ sizes[variable].rem }}</td>
			<td>{{ sizes[variable].px }}</td>
		</tr>
	</table>
</template>

<style lang="scss" module>
.table {
	text-align: center;
	color: var(--color-text-dark);
}

.row {
	min-width: 150px;
}
</style>
