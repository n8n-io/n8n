<script setup lang="ts">
import { onMounted, ref, getCurrentInstance } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useActions } from '../composables/useActions';
import { Carousel, CarouselItem } from 'element-ui';
import { useAI } from './useAI.composable';
import StepNodesSuggestion from './StepNodesSuggestion.vue';
import StepActionsSuggestion from './StepActionsSuggestion.vue';
import StepWorkflowSuggestion from './StepWorkflowSuggestion.vue';
import UserPrompt from './UserPrompt.vue';
import 'element-ui/lib/theme-chalk/carousel-item.css';
import 'element-ui/lib/theme-chalk/carousel.css';
import { useToast } from '@/composables';
import { Connection } from '@jsplumb/core';

const { showError } = useToast();
const emit = defineEmits(['nodeTypeSelected', 'reset']);
const instance = getCurrentInstance();
const telemetry = instance?.proxy.$telemetry;

const { matchString, reset } = useAI();
const { addConnection } = useWorkflowsStore();
const { getActionData, setAddedNodeActionParameters } = useActions();
const { visibleNodeTypes, getNodeTypes } = useNodeTypesStore();
const carouselRef = ref<Carousel | null>(null);

onMounted(async () => {
	await getNodeTypes();
});

function addPseudoWorkflowToCanvas() {
	const actions = Object.values(useNodeCreatorStore().actions).flat();
	const pseudoWorkflow = useAI().pseudoWorkflow;
	const matchedActions = pseudoWorkflow
		.map((a) => {
			const [resource, actionKey] = a.actionKey.split(':');

			return actions.find((action) => {
				const hasResource = !!resource;
				const matchesNode = matchString(action.name, a.node, false);
				const matchesKey = matchString(action.actionKey, actionKey, true);
				const matchesResource = hasResource
					? (action.displayOptions?.show?.resource || []).includes(resource)
					: true;
				return matchesNode && matchesKey && matchesResource;
			});
		})
		.filter((a) => !!a);

	const actionsData = (matchedActions || []).map(getActionData);
	const canvasNodes = useWorkflowsStore().allNodes;

	for (const [i, action] of actionsData.entries()) {
		setTimeout(() => {
			const pseudoAction = pseudoWorkflow[i];
			emit('nodeTypeSelected', [action.key]);
			setAddedNodeActionParameters(action, telemetry, 'AI', () => {
				const inputs = pseudoAction.inputActions;

				inputs.forEach((pseudoParentIndex: string) => {
					try {
						const parentIndex = parseInt(pseudoParentIndex) - 1;
						const pseudoParent = pseudoWorkflow[parentIndex];
						const parent = canvasNodes[parentIndex];

						const parentName = parent.name;
						const currentNodeName = canvasNodes[i]?.name;
						const parentOutputIndex = pseudoParent.outputActions.indexOf(pseudoAction.id);
						const actionInputIndex = pseudoAction.inputActions.indexOf(pseudoParent.id);
						const parentNodeType = visibleNodeTypes.find((n) => n.name === parent.type);
						const currentNodeType = visibleNodeTypes.find((n) => n.name === canvasNodes[i].type);

						const finalOutputIndex =
							(parentNodeType?.outputs || []).length - 1 >= parentOutputIndex
								? parentOutputIndex
								: 0;

						const finalInputIndex =
							(currentNodeType?.inputs || []).length - 1 >= actionInputIndex ? actionInputIndex : 0;
						const connection = [
							{
								node: parentName,
								type: 'main',
								index: finalOutputIndex,
							},
							{
								node: currentNodeName,
								type: 'main',
								index: finalInputIndex,
							},
						];
						addConnection({ connection });
					} catch (error) {
						console.error('Failed to create node connection: ', error);
						showError(
							error,
							'Failed to create node connection',
							`Connection: ${Connection.toString()}`,
						);
					}
				});

				if (i === actionsData.length - 1) {
					emit('reset');
				}
			});
		}, i * 100);
		setTimeout(() => {
			reset();
			carouselRef.value?.setActiveItem(0);
		}, 1500);
	}
}

const AVAILABLE_STEPS = {
	PROMPT: 'prompt',
	NODES_SUGGESTION: 'nodesSuggestion',
	ACTIONS_SUGGESTION: 'actionsSuggestion',
	WORKFLOW_SUGGESTION: 'workflowSuggestion',
};

const stepsComponentsMapper = {
	[AVAILABLE_STEPS.PROMPT]: UserPrompt,
	[AVAILABLE_STEPS.NODES_SUGGESTION]: StepNodesSuggestion,
	[AVAILABLE_STEPS.ACTIONS_SUGGESTION]: StepActionsSuggestion,
	[AVAILABLE_STEPS.WORKFLOW_SUGGESTION]: StepWorkflowSuggestion,
};
const STEPS = [
	AVAILABLE_STEPS.PROMPT,
	AVAILABLE_STEPS.NODES_SUGGESTION,
	AVAILABLE_STEPS.ACTIONS_SUGGESTION,
	AVAILABLE_STEPS.WORKFLOW_SUGGESTION,
];

function goStepBack() {
	carouselRef.value?.prev();
}

function goStepForward() {
	carouselRef.value?.next();
}
</script>

<template>
	<div :class="$style.container">
		<carousel
			:class="$style.carousel"
			:autoplay="false"
			indicator-position="none"
			:loop="false"
			arrow="never"
			:height="'400px'"
			ref="carouselRef"
		>
			<carousel-item v-for="(item, key) in STEPS" :key="key" :name="item">
				<component
					:is="stepsComponentsMapper[item]"
					@next="goStepForward"
					@back="goStepBack"
					@setWorkflow="addPseudoWorkflowToCanvas"
				/>
			</carousel-item>
		</carousel>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 500px;
	left: 40px;
	top: 40px;
	position: absolute;
	background: white;
	border-radius: 6px;
	flex-direction: column;
	padding: 15px;
	border: 1px solid #ccc;
}
</style>
