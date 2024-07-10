<script setup lang="ts">
import { ref } from 'vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { NODE_CREATOR_OPEN_SOURCES } from '@/constants';

const nodeCreatorStore = useNodeCreatorStore();

const showTooltip = ref(false);

function onClick() {
	nodeCreatorStore.openNodeCreatorForTriggerNodes(
		NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON,
	);
}
</script>
<template>
	<div ref="container" :class="$style.addNodes" data-test-id="canvas-add-button">
		<n8n-tooltip
			placement="top"
			:visible="showTooltip"
			:disabled="nodeCreatorStore.showScrim"
			:popper-class="$style.tooltip"
			:show-after="700"
		>
			<button :class="$style.button" data-test-id="canvas-plus-button" @click="onClick">
				<font-awesome-icon icon="plus" size="lg" />
			</button>
			<template #content>
				{{ $locale.baseText('nodeView.canvasAddButton.addATriggerNodeBeforeExecuting') }}
			</template>
		</n8n-tooltip>
		<p :class="$style.label" v-text="$locale.baseText('nodeView.canvasAddButton.addFirstStep')" />
	</div>
</template>

<!--<script setup lang="ts">-->
<!--import { computed } from 'vue';-->
<!--import type { XYPosition } from '@/Interface';-->
<!--import { useNodeCreatorStore } from '@/stores/nodeCreator.store';-->

<!--export interface Props {-->
<!--	showTooltip: boolean;-->
<!--	position: XYPosition;-->
<!--}-->

<!--const props = defineProps<Props>();-->

<!--const nodeCreatorStore = useNodeCreatorStore();-->
<!--const containerCssVars = computed(() => ({-->
<!--	'&#45;&#45;trigger-placeholder-left-position': `${props.position[0]}px`,-->
<!--	'&#45;&#45;trigger-placeholder-top-position': `${props.position[1]}px`,-->
<!--}));-->
<!--</script>-->

<style lang="scss" module>
.addNodes {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100px;
	height: 100px;

	&:hover .button svg path {
		fill: var(--color-primary);
	}
}

.button {
	background: var(--color-foreground-xlight);
	border: 2px dashed var(--color-foreground-xdark);
	border-radius: 8px;
	padding: 0;

	min-width: 100px;
	min-height: 100px;
	cursor: pointer;

	svg {
		width: 26px !important;
		height: 40px;
		path {
			fill: var(--color-foreground-xdark);
		}
	}
}

.label {
	width: max-content;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
	color: var(--color-text-dark);
	margin-top: var(--spacing-2xs);
}
</style>
