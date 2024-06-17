<script setup lang="ts">
import type { PropType } from 'vue';
import { ref, onMounted, onUnmounted, reactive } from 'vue';

// Define props with their types
const props = defineProps({
	variables: {
		type: Array as PropType<string[]>,
		required: true,
	},
	attr: {
		type: String,
		default: '',
	},
});

const sizes = reactive<Record<string, { rem: string; px: number }>>({});
const observer = ref<MutationObserver | null>(null);

const setSizes = () => {
	for (const variable of props.variables) {
		const style = getComputedStyle(document.body);
		const rem = style.getPropertyValue(variable);
		const px = parseFloat(rem.replace('rem', '')) * 16; // Assuming default font-size is 16px

		sizes[variable] = { rem, px };
	}
};

onMounted(() => {
	setSizes();

	// Observing attributes changes in body to recompute sizes
	const mutationObserverCallback = (mutationsList: MutationRecord[]) => {
		for (const mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				setSizes();
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
