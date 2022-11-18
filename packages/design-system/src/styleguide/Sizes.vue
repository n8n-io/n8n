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

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'sizes',
	data() {
		return {
			observer: null as null | MutationObserver,
			sizes: {} as Record<string, { rem: string; px: string; }>,
		};
	},
	props: {
		variables: {
			type: Array,
			required: true,
		},
		attr: {
			type: String,
		},
	},
	created() {
		const setSizes = () => {
			(this.variables as string[]).forEach((variable: string) => {
				const style = getComputedStyle(document.body);
				const rem = style.getPropertyValue(variable);
				const px = parseFloat(rem.replace('rem', '')) * 16;

				this.sizes[variable] = { rem, px };
			});
		};

		setSizes();

		// when theme class is added or removed, reset color values
		this.observer = new MutationObserver((mutationsList) => {
			for (const mutation of mutationsList) {
				if (mutation.type === 'attributes') {
					setSizes();
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
