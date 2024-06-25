<template>
	<ElTooltip v-bind="{ ...$props, ...$attrs }" :popper-class="$props.popperClass ?? 'n8n-tooltip'">
		<slot />
		<template #content>
			<slot name="content">
				<div v-html="content"></div>
			</slot>
			<div
				v-if="buttons.length"
				:class="$style.buttons"
				:style="{ justifyContent: justifyButtons }"
			>
				<N8nButton
					v-for="button in buttons"
					:key="button.attrs.label"
					v-bind="{ ...button.attrs, ...button.listeners }"
				/>
			</div>
		</template>
	</ElTooltip>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { ElTooltip } from 'element-plus';
import type { IN8nButton } from 'n8n-design-system/types';
import N8nButton from '../N8nButton';

export default defineComponent({
	name: 'N8nTooltip',
	components: {
		ElTooltip,
		N8nButton,
	},
	inheritAttrs: false,
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
