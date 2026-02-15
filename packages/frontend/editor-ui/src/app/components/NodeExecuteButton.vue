<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { ButtonSize, IUpdateInformation } from '@/Interface';
import type { ButtonVariant } from '@n8n/design-system';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeExecution } from '@/app/composables/useNodeExecution';

const NODE_TEST_STEP_POPUP_COUNT_KEY = 'N8N_NODE_TEST_STEP_POPUP_COUNT';
const MAX_POPUP_COUNT = 10;
const POPUP_UPDATE_DELAY = 3000;

const props = withDefaults(
	defineProps<{
		nodeName: string;
		telemetrySource: string;
		disabled?: boolean;
		label?: string;
		variant?: ButtonVariant;
		size?: ButtonSize;
		icon?: IconName;
		square?: boolean;
		transparent?: boolean;
		hideIcon?: boolean;
		hideLabel?: boolean;
		tooltip?: string;
		tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
		showLoadingSpinner?: boolean;
		executionMode?: 'inclusive' | 'exclusive';
	}>(),
	{
		disabled: false,
		transparent: false,
		square: false,
		showLoadingSpinner: true,
		executionMode: 'inclusive',
	},
);

const emit = defineEmits<{
	stopExecution: [];
	execute: [];
	valueChanged: [value: IUpdateInformation];
}>();

const slots = defineSlots<{ persistentTooltipContent?: {} }>();

defineOptions({
	inheritAttrs: false,
});

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const ndvStore = useNDVStore();

const node = computed(() => workflowsStore.getNodeByName(props.nodeName));

const {
	isExecuting,
	isListening,
	isListeningForWorkflowEvents,
	buttonLabel: nodeButtonLabel,
	buttonIcon: nodeButtonIcon,
	disabledReason,
	isTriggerNode,
	hasIssues,
	shouldGenerateCode,
	execute,
} = useNodeExecution(node, {
	telemetrySource: props.telemetrySource,
	executionMode: computed(() => props.executionMode),
	source: 'RunData.ExecuteNodeButton',
	onCodeGenerated: (update) => emit('valueChanged', update),
});

const lastPopupCountUpdate = ref(0);

const disabledHint = computed(() => {
	// NDV-specific: when the button's node is a trigger with issues
	// and the active NDV node is a different node, show "fix previous"
	if (isTriggerNode.value && hasIssues.value) {
		const activeNode = ndvStore.activeNode;
		if (activeNode && activeNode.name !== props.nodeName) {
			return i18n.baseText('ndv.execute.fixPrevious');
		}
	}
	return disabledReason.value;
});

const buttonLabel = computed(() => {
	if (props.hideLabel) return '';
	if (props.label && !isListening.value && !isListeningForWorkflowEvents.value) return props.label;
	return nodeButtonLabel.value;
});

const buttonIcon = computed((): IconName | undefined => {
	if (props.icon) return props.icon;
	if (props.hideIcon) return undefined;
	return nodeButtonIcon.value;
});

const tooltipText = computed(() => {
	if (shouldGenerateCode.value) {
		return i18n.baseText('ndv.execute.generateCodeAndTestNode.description');
	}
	if (disabledHint.value) return disabledHint.value;
	if (props.tooltip && !isExecuting.value && testStepButtonPopupCount() < MAX_POPUP_COUNT) {
		return props.tooltip;
	}
	return '';
});

function testStepButtonPopupCount() {
	return Number(localStorage.getItem(NODE_TEST_STEP_POPUP_COUNT_KEY));
}

function onMouseOver() {
	const count = testStepButtonPopupCount();

	if (count < MAX_POPUP_COUNT && !disabledHint.value && tooltipText.value) {
		const now = Date.now();
		if (!lastPopupCountUpdate.value || now - lastPopupCountUpdate.value >= POPUP_UPDATE_DELAY) {
			localStorage.setItem(NODE_TEST_STEP_POPUP_COUNT_KEY, `${count + 1}`);
			lastPopupCountUpdate.value = now;
		}
	}
}

async function onClick() {
	const result = await execute();
	if (result === 'executed') emit('execute');
	if (result === 'stopped-execution') emit('stopExecution');
}
</script>

<template>
	<N8nTooltip
		:placement="tooltipPlacement ?? 'right'"
		:disabled="!tooltipText && !slots.persistentTooltipContent"
		:visible="slots.persistentTooltipContent ? true : undefined"
	>
		<template #content>
			<slot name="persistentTooltipContent">
				{{ tooltipText }}
			</slot>
		</template>
		<N8nButton
			v-bind="$attrs"
			:loading="isExecuting && showLoadingSpinner"
			:disabled="disabled || !!disabledHint || (isExecuting && !showLoadingSpinner)"
			:label="buttonLabel"
			:variant="variant"
			:size="size"
			:icon="buttonIcon"
			:square="square"
			:transparent-background="transparent"
			:title="
				!isTriggerNode && !tooltipText ? i18n.baseText('ndv.execute.testNode.description') : ''
			"
			@mouseover="onMouseOver"
			@click="onClick"
		/>
	</N8nTooltip>
</template>
