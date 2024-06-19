<template>
	<ElTooltip v-bind="tooltipProps" :popper-class="$props.popperClass ?? 'n8n-tooltip'">
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

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { ElTooltip, type ElTooltipProps } from 'element-plus';
import N8nButton from '../N8nButton/Button.vue';
import type { IN8nButton } from '../../types/button';

defineOptions({
	name: 'N8nTooltip',
	inheritAttrs: false,
});

interface Props extends Partial<ElTooltipProps> {
	content: string;
	justifyButtons: string;
	buttons: IN8nButton[];
}

const props = withDefaults(defineProps<Props>(), {
	content: '',
	justifyButtons: 'flex-end',
	buttons: () => [],
	disabled: false,
	showAfter: 0,
});

const attrs = useAttrs();

const tooltipProps = computed(() => ({ ...props, ...attrs }));
</script>

<style lang="scss" module>
.buttons {
	display: flex;
	align-items: center;
	margin-top: var(--spacing-s);
	gap: var(--spacing-2xs);
}
</style>
