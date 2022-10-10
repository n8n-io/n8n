<template>
	<el-tooltip v-bind="$attrs">
		<template v-for="(_, slotName) in $slots" #[slotName]>
			<slot :name="slotName"/>
			<div :key="slotName" v-if="slotName === 'content' && buttons.length" :class="$style.buttons" :style="{ justifyContent: justifyButtons }">
				<n8n-button
						v-for="button in buttons"
						:key="button.attrs.label"
						v-bind="button.attrs"
						v-on="button.listeners"
				/>
			</div>
		</template>
	</el-tooltip>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import ElTooltip from 'element-ui/lib/tooltip';
import type { IN8nButton } from "@/types";
import N8nButton from '../N8nButton';

export default Vue.extend({
	name: 'n8n-tooltip',
	inheritAttrs: false,
	components: {
		ElTooltip, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
		N8nButton,
	},
	props: {
		justifyButtons: {
			type: String,
			default: 'flex-end',
			validator: (value: string): boolean => ['flex-start', 'flex-end', 'start', 'end', 'left', 'right', 'center', 'space-between', 'space-around', 'space-evenly'].includes(value),
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
