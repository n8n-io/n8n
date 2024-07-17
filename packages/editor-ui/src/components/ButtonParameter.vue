<script setup lang="ts">
import type { INodeProperties, NodePropertyAction } from 'n8n-workflow';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { ref, computed, onMounted } from 'vue';
import { N8nButton, N8nInput, N8nTooltip } from 'n8n-design-system/components';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getSchemas } from './CodeNodeEditor/utils';

const MIN_PROMPT_LENGTH = 10;

const emit = defineEmits<{
	// submit: [code: string];
	valueChanged: [value: IUpdateInformation];
}>();

const props = defineProps<{
	parameter: INodeProperties;
	value: string;
	path: string;
}>();

const nodeTypesStore = useNodeTypesStore();

const i18n = useI18n();

const isLoading = ref(false);
const prompt = ref(props.value);
const parentNodes = ref<INodeUi[]>([]);

const isSubmitEnabled = computed(() => {
	if (!hasExecutionData.value) return false;
	if (prompt.value.length < MIN_PROMPT_LENGTH) return false;

	const maxlength = props.parameter.typeOptions?.buttonInputFieldMaxLength;
	if (maxlength && prompt.value.length > maxlength) return false;

	return true;
});
const hasExecutionData = computed(() => (useNDVStore().ndvInputData || []).length > 0);

function getParentNodes() {
	const activeNode = useNDVStore().activeNode;
	const { getCurrentWorkflow, getNodeByName } = useWorkflowsStore();
	const workflow = getCurrentWorkflow();

	if (!activeNode || !workflow) return [];

	return workflow
		.getParentNodesByDepth(activeNode?.name)
		.filter(({ name }, i, nodes) => {
			return name !== activeNode.name && nodes.findIndex((node) => node.name === name) === i;
		})
		.map((n) => getNodeByName(n.name))
		.filter((n) => n !== null) as INodeUi[];
}

function startLoading() {
	isLoading.value = true;
}

function stopLoading() {
	setTimeout(() => {
		isLoading.value = false;
	}, 200);
}

function getPath(parameter: string) {
	return ((props.path ? `${props.path}.` : '') + parameter) as string;
}

async function onSubmit() {
	const { activeNode } = useNDVStore();
	const { showMessage } = useToast();
	const action: string | NodePropertyAction | undefined = props.parameter.typeOptions?.action;

	if (!action || !activeNode) return;

	if (typeof action === 'string') {
		switch (action) {
			default:
				return;
		}
	}

	emit('valueChanged', {
		name: getPath(props.parameter.name),
		value: prompt.value,
	});

	const { type, handler, target } = action;

	startLoading();

	try {
		const currentNodeParameters = activeNode.parameters;
		console.log(getSchemas());
		const actionResult = await nodeTypesStore.getNodeParameterActionResult({
			nodeTypeAndVersion: {
				name: activeNode.type,
				version: activeNode.typeVersion,
			},
			path: props.path,
			currentNodeParameters,
			credentials: activeNode.credentials,
			handler,
			payload: prompt.value,
			inputData: useNDVStore().ndvInputData,
		});

		if (actionResult === undefined) return;

		switch (type) {
			case 'updateProperty':
				//TODO: code editor does not displays updated value, needs to be closed and reopened
				const updateInformation = {
					name: getPath(target as string),
					value: actionResult,
				};
				emit('valueChanged', updateInformation);
				break;
			default:
				return;
		}

		showMessage({
			type: 'success',
			title: i18n.baseText('codeNodeEditor.askAi.generationCompleted'),
		});

		stopLoading();
	} catch (error) {
		showMessage({
			type: 'error',
			title: i18n.baseText('codeNodeEditor.askAi.generationFailed'),
			message: error.message,
		});
		stopLoading();
	}
}

function onPromptInput(inputValue: string) {
	prompt.value = inputValue;
	emit('valueChanged', {
		name: getPath(props.parameter.name),
		value: inputValue,
	});
}

onMounted(() => {
	parentNodes.value = getParentNodes();
});
</script>

<template>
	<div>
		<p
			:class="$style.intro"
			v-text="parameter.displayName"
			:hidden="!parameter.typeOptions?.buttonHasInputField"
		/>
		<div :class="$style.inputContainer" :hidden="!parameter.typeOptions?.buttonHasInputField">
			<div :class="$style.meta">
				<span
					v-if="parameter.typeOptions?.buttonInputFieldMaxLength"
					v-show="prompt.length > 1"
					:class="$style.counter"
					v-text="`${prompt.length} / ${parameter.typeOptions?.buttonInputFieldMaxLength}`"
				/>
			</div>
			<N8nInput
				v-model="prompt"
				:class="$style.input"
				style="border: 1px solid var(--color-foreground-base)"
				type="textarea"
				:rows="6"
				:maxlength="parameter.typeOptions?.buttonInputFieldMaxLength"
				:placeholder="parameter.placeholder"
				@input="onPromptInput"
			/>
		</div>
		<div :class="$style.controls">
			<N8nTooltip :disabled="isSubmitEnabled">
				<div>
					<N8nButton
						:disabled="!isSubmitEnabled"
						size="small"
						@click="onSubmit"
						:loading="isLoading"
					>
						{{ parameter.typeOptions?.buttonLabel ?? parameter.displayName }}
					</N8nButton>
				</div>
				<template #content>
					<span
						v-if="!hasExecutionData"
						v-text="i18n.baseText('codeNodeEditor.askAi.noInputData')"
					/>
					<span
						v-else-if="prompt.length === 0"
						v-text="i18n.baseText('codeNodeEditor.askAi.noPrompt')"
					/>
					<span
						v-else-if="prompt.length < MIN_PROMPT_LENGTH"
						v-text="
							i18n.baseText('codeNodeEditor.askAi.promptTooShort', {
								interpolate: { minLength: String(MIN_PROMPT_LENGTH) },
							})
						"
					/>
				</template>
			</N8nTooltip>
		</div>
	</div>
</template>

<style module lang="scss">
.input * {
	border: 0 !important;
}
.input textarea {
	font-size: var(--font-size-2xs);
	padding-bottom: var(--spacing-2xl);
	font-family: var(--font-family);
	resize: none;
}
.intro {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	padding: var(--spacing-2xs) 0 0;
}
.inputContainer {
	position: relative;
}
.meta {
	display: flex;
	justify-content: space-between;
	position: absolute;
	bottom: var(--spacing-2xs);
	left: var(--spacing-xs);
	right: var(--spacing-xs);
	z-index: 1;

	* {
		font-size: var(--font-size-2xs);
		line-height: 1;
	}
}
.counter {
	color: var(--color-text-light);
}
.controls {
	padding: var(--spacing-2xs) 0;
	display: flex;
	justify-content: flex-end;
}
</style>
