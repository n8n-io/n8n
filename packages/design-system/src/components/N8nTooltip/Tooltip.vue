<template>
	<el-tooltip v-bind="$attrs">
		<template v-for="(_, slotName) in $slots" #[slotName]>
			<slot :name="slotName"/>
			<div :key="slotName" v-if="slotName === 'content' && buttons.length" :class="$style.buttons">
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
		alignButtons: {
			type: String,
			default: 'right',
			validator: (value: string): boolean => ['left', 'center', 'right'].includes(value),
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
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	margin-top: var(--spacing-s);
}
</style>
