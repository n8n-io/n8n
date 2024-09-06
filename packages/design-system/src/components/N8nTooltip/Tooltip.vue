<script setup lang="ts">
import type { PropType } from 'vue';
import { ElTooltip } from 'element-plus';
import type { IN8nButton } from 'n8n-design-system/types';
import N8nButton from '../N8nButton';

export type Justify =
	| 'flex-start'
	| 'flex-end'
	| 'start'
	| 'end'
	| 'left'
	| 'right'
	| 'center'
	| 'space-between'
	| 'space-around'
	| 'space-evenly';

// eslint-disable-next-line vue/valid-define-props, vue/require-macro-variable-name
const elTooltipProps = defineProps({
	...ElTooltip.props,
});

// eslint-disable-next-line vue/valid-define-props
defineProps({
	content: {
		type: String,
		default: '',
	},
	justifyButtons: {
		type: String as PropType<Justify>,
		default: 'flex-end',
	},
	buttons: {
		type: Array as PropType<IN8nButton[]>,
		default: () => [],
	},
});

defineOptions({
	inheritAttrs: false,
});
</script>

<template>
	<ElTooltip
		v-bind="{ ...elTooltipProps, ...$attrs }"
		:popper-class="elTooltipProps.popperClass ?? 'n8n-tooltip'"
	>
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

<style lang="scss" module>
.buttons {
	display: flex;
	align-items: center;
	margin-top: var(--spacing-s);
	gap: var(--spacing-2xs);
}
</style>
