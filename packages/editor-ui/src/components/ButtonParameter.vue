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
import { ASK_AI_EXPERIMENT } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { usePostHog } from '@/stores/posthog.store';
import { useRootStore } from '@/stores/root.store';
import { generateCodeForPrompt } from '@/api/ai';

const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
}>();

const props = defineProps<{
	parameter: INodeProperties;
	value: string;
	path: string;
}>();

const nodeTypesStore = useNodeTypesStore();
const settingsStore = useSettingsStore();
const posthog = usePostHog();
const rootStore = useRootStore();

const i18n = useI18n();

const isLoading = ref(false);
const prompt = ref(props.value);
const parentNodes = ref<INodeUi[]>([]);

const isSubmitEnabled = computed(() => {
	if (!hasExecutionData.value) return false;
	if (!prompt.value) return false;

	const maxlength = props.parameter.typeOptions?.buttonInputFieldMaxLength;
	if (maxlength && prompt.value.length > maxlength) return false;

	return true;
});
const hasExecutionData = computed(() => (useNDVStore().ndvInputData || []).length > 0);

const aiEnabled = computed(() => {
	const isAiExperimentEnabled = [ASK_AI_EXPERIMENT.gpt3, ASK_AI_EXPERIMENT.gpt4].includes(
		(posthog.getVariant(ASK_AI_EXPERIMENT.name) ?? '') as string,
	);

	return isAiExperimentEnabled && settingsStore.settings.ai.enabled;
});

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

// function createPrompt(prompt: string) {
// 	return `
// Generate JavaScript code for this prompt:

// ---
// ${prompt}
// ---

// input available by calling $input.all(), assume $input variable is defined already:

// return has to be an array of objects each must containe single property json that should be an object
// always have return statment
// return only code snippet without any additional explanation or comments
// format code as by using prettify`;
// }

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
		const schemas = getSchemas();
		const version = rootStore.versionCli;
		const model =
			usePostHog().getVariant(ASK_AI_EXPERIMENT.name) === ASK_AI_EXPERIMENT.gpt4
				? 'gpt-4'
				: 'gpt-3.5-turbo-16k';

		const payload = {
			question: prompt.value,
			context: {
				schema: schemas.parentNodesSchemas,
				inputSchema: schemas.inputSchema!,
				ndvPushRef: useNDVStore().pushRef,
				pushRef: rootStore.pushRef,
			},
			model,
			n8nVersion: version,
		};
		switch (type) {
			case 'generateCodeFromPrompt':
				let value;
				if (aiEnabled.value) {
					const { restApiContext } = useRootStore();
					const { code } = await generateCodeForPrompt(restApiContext, payload);
					value = code;
				} else {
					const currentNodeParameters = activeNode.parameters;

					value = await nodeTypesStore.getNodeParameterActionResult({
						nodeTypeAndVersion: {
							name: activeNode.type,
							version: activeNode.typeVersion,
						},
						path: props.path,
						currentNodeParameters,
						credentials: activeNode.credentials,
						handler,
						payload,
					});
				}
				if (value === undefined) return;

				const updateInformation = {
					name: getPath(target as string),
					value,
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
		<n8n-input-label
			:label="i18n.nodeText().inputLabelDisplayName(parameter, path)"
			:tooltip-text="i18n.nodeText().inputLabelDescription(parameter, path)"
			:hidden="!parameter.typeOptions?.buttonHasInputField"
			:bold="false"
			size="small"
			color="text-dark"
		>
		</n8n-input-label>
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
						type="secondary"
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
