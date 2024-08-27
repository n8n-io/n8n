<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';

interface VariableTableProps {
	variables: string[];
	attr?: string;
}

const props = withDefaults(defineProps<VariableTableProps>(), {
	attr: '',
});

let observer: MutationObserver | null = null;
let values: Record<string, string> = {};

onMounted(() => {
	const setValues = () => {
		props.variables.forEach((variable) => {
			const style = getComputedStyle(document.body);
			const value = style.getPropertyValue(variable);

			values = {
				...values,
				[variable]: value,
			};
		});
	};

	setValues();

	// when theme class is added or removed, reset color values
	observer = new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				setValues();
			}
		}
	});
	const body = document.querySelector('body');
	if (body) {
		observer.observe(body, { attributes: true });
	}
});

onUnmounted(() => {
	observer?.disconnect();
});
</script>

<template>
	<table :class="$style.table">
		<tr>
			<th :class="$style.row">Name</th>
			<th :class="$style.row">Value</th>
		</tr>
		<tr
			v-for="variable in variables"
			:key="variable"
			:style="attr ? { [attr]: `var(${variable})` } : {}"
		>
			<td>{{ variable }}</td>
			<td>{{ values[variable] }}</td>
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
