<template>
	<el-tooltip v-bind="{ ...$props, ...$attrs }" :popperClass="$props.popperClass ?? 'n8n-tooltip'">
		<slot />
		<template #content>
			<slot name="content">
				{{ content }}
			</slot>
			<div
				v-if="buttons.length"
				:class="$style.buttons"
				:style="{ justifyContent: justifyButtons }"
			>
				<n8n-button
					v-for="button in buttons"
					:key="button.attrs.label"
					v-bind="{ ...button.attrs, ...button.listeners }"
				/>
			</div>
		</template>
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
		content: {
			type: String,
			default: '',
		},
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
	gap: var(--spacing-2xs);
}
</style>
