<script setup lang="ts">
import { ElTooltip } from 'element-plus';
import type { PropType } from 'vue';

import type { IN8nButton } from '@n8n/design-system/types';

import { useInjectTooltipAppendTo } from '../../composables/useTooltipAppendTo';
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

const props = defineProps({
	...ElTooltip.props,
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

const appendTo = useInjectTooltipAppendTo();
</script>

<template>
	<ElTooltip
		v-bind="{ ...props, ...$attrs }"
		:append-to="props.appendTo ?? appendTo"
		:popper-class="props.popperClass ?? 'n8n-tooltip'"
	>
		<slot />
		<template #content>
			<slot name="content">
				<div v-n8n-html="props.content"></div>
			</slot>
			<div
				v-if="props.buttons.length"
				:class="$style.buttons"
				:style="{ justifyContent: props.justifyButtons }"
			>
				<N8nButton
					v-for="button in props.buttons"
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
