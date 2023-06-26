<template>
	<el-tooltip v-bind="{ ...$props, ...$attrs }">
		<template #content>
			<n8n-button
				v-for="button in buttons"
				:key="button.attrs.label"
				v-bind="button.attrs"
				v-on="button.listeners"
			/>
			<slot name="content"></slot>
		</template>
		<slot />
	</el-tooltip>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { ElTooltip } from 'element-plus';
import type { IN8nButton } from '@/types';
import N8nButton from '../N8nButton';

export default defineComponent({
	name: 'n8n-tooltip',
	inheritAttrs: false,
	components: {
		ElTooltip,
		N8nButton,
	},
	props: {
		...ElTooltip.props,
		justifyButtons: {
			type: String,
			default: 'flex-end',
			validator: (value: string): boolean =>
				[
					'flex-start',
					'flex-end',
					'start',
					'end',
					'left',
					'right',
					'center',
					'space-between',
					'space-around',
					'space-evenly',
				].includes(value),
		},
		buttons: {
			type: Array as PropType<IN8nButton[]>,
			default: () => [],
		},
	},
});
</script>

<style lang="scss" module>
.buttons {
	display: flex;
	align-items: center;
	margin-top: var(--spacing-s);
}
</style>
