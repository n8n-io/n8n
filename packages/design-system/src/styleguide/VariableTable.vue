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

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'variable-table',
	data() {
		return {
			observer: null as null | MutationObserver,
			values: {} as Record<string, string>,
		};
	},
	props: {
		variables: {
			type: Array as PropType<string[]>,
			required: true,
		},
		attr: {
			type: String,
			default: '',
		},
	},
	created() {
		const setValues = () => {
			this.variables.forEach((variable) => {
				const style = getComputedStyle(document.body);
				const value = style.getPropertyValue(variable);

				this.$set(this.values, variable, value);
			});
		};

		setValues();

		// when theme class is added or removed, reset color values
		this.observer = new MutationObserver((mutationsList) => {
			for (const mutation of mutationsList) {
				if (mutation.type === 'attributes') {
					setValues();
				}
			}
		});
		const body = document.querySelector('body');
		if (body) {
			this.observer.observe(body, { attributes: true });
		}
	},
	destroyed() {
		if (this.observer) {
			this.observer.disconnect();
		}
	},
});
</script>

<style lang="scss" module>
.table {
	text-align: center;
	color: var(--color-text-dark);
}

.row {
	min-width: 150px;
}
</style>
