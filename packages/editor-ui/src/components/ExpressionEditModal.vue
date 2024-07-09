<template>
	<el-dialog
		width="80%"
		append-to-body
		:class="$style.modal"
		:model-value="dialogVisible"
		:title="$locale.baseText('expressionEdit.editExpression')"
		:before-close="closeDialog"
	>
		<div :class="$style.container">
			<div :class="$style.schema">
				<N8nInput
					v-model="search"
					size="small"
					:class="$style.search"
					:placeholder="i18n.baseText('ndv.search.placeholder.input.schema')"
				>
					<template #prefix>
						<N8nIcon :class="$style.ioSearchIcon" icon="search" />
					</template>
				</N8nInput>

				<RunDataSchema
					:search="appliedSearch"
					:nodes="parentNodes"
					mapping-enabled
					pane-type="input"
					connection-type="main"
				/>
			</div>

			<div :class="$style.io">
				<div :class="$style.input">
					<div :class="$style.header">
						<N8nText bold size="large">
							{{ i18n.baseText('expressionEdit.expression') }}
						</N8nText>
						<N8nText
							:class="$style.tip"
							size="small"
							v-html="i18n.baseText('expressionTip.javascript')"
						/>
					</div>

					<DraggableTarget type="mapping" @drop="onDrop">
						<template #default="{ droppable, activeDrop }">
							<ExpressionEditorModalInput
								ref="expressionInputRef"
								:model-value="modelValue"
								:is-read-only="isReadOnly"
								:path="path"
								:class="{
									'ph-no-capture': redactValues,
									[$style.drop]: droppable,
									[$style.activeDrop]: activeDrop,
								}"
								data-test-id="expression-modal-input"
								@change="valueChanged"
								@close="closeDialog"
							/>
						</template>
					</DraggableTarget>
				</div>

				<div :class="$style.output">
					<div :class="$style.header">
						<N8nText bold size="large">
							{{ i18n.baseText('parameterInput.result') }}
						</N8nText>
						<OutputItemSelect />
					</div>

					<div :class="{ 'ph-no-capture': redactValues }">
						<ExpressionOutput
							ref="expressionResultRef"
							:segments="segments"
							:extensions="theme"
							data-test-id="expression-modal-output"
						/>
					</div>
				</div>
			</div>
		</div>
	</el-dialog>
</template>

<script setup lang="ts">
import ExpressionEditorModalInput from '@/components/ExpressionEditorModal/ExpressionEditorModalInput.vue';
import { computed, ref, watch } from 'vue';

import { useExternalHooks } from '@/composables/useExternalHooks';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createExpressionTelemetryPayload } from '@/utils/telemetryUtils';

import { useTelemetry } from '@/composables/useTelemetry';
import type { Segment } from '@/types/expressions';
import type { INodeProperties } from 'n8n-workflow';
import { outputTheme } from './ExpressionEditorModal/theme';
import ExpressionOutput from './InlineExpressionEditor/ExpressionOutput.vue';
import RunDataSchema from './RunDataSchema.vue';
import OutputItemSelect from './InlineExpressionEditor/OutputItemSelect.vue';
import { useI18n } from '@/composables/useI18n';
import { useDebounce } from '@/composables/useDebounce';
import DraggableTarget from './DraggableTarget.vue';

type Props = {
	parameter: INodeProperties;
	path: string;
	modelValue: string;
	dialogVisible?: boolean;
	eventSource?: string;
	redactValues?: boolean;
	isReadOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	eventSource: '',
	dialogVisible: false,
	redactValues: false,
	isReadOnly: false,
});
const emit = defineEmits<{
	'update:modelValue': [value: string];
	closeDialog: [];
}>();

const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();

const telemetry = useTelemetry();
const i18n = useI18n();
const externalHooks = useExternalHooks();
const { debounce } = useDebounce();

const segments = ref<Segment[]>([]);
const search = ref('');
const appliedSearch = ref('');
const dropPosition = ref(0);
const expressionInputRef = ref<InstanceType<typeof ExpressionEditorModalInput>>();
const expressionResultRef = ref<InstanceType<typeof ExpressionOutput>>();
const theme = outputTheme();

const activeNode = computed(() => ndvStore.activeNode);
const workflow = computed(() => workflowsStore.getCurrentWorkflow());
const parentNodes = computed(() => {
	const node = activeNode.value;
	if (!node) return [];
	const nodes = workflow.value.getParentNodesByDepth(node.name);

	return nodes.filter(({ name }) => name !== node.name);
});

watch(
	() => props.dialogVisible,
	(newValue) => {
		const resolvedExpressionValue = expressionResultRef.value?.getValue() ?? '';

		void externalHooks.run('expressionEdit.dialogVisibleChanged', {
			dialogVisible: newValue,
			parameter: props.parameter,
			value: props.modelValue,
			resolvedExpressionValue,
		});

		if (!newValue) {
			const telemetryPayload = createExpressionTelemetryPayload(
				segments.value,
				props.modelValue,
				workflowsStore.workflowId,
				ndvStore.pushRef,
				ndvStore.activeNode?.type ?? '',
			);

			telemetry.track('User closed Expression Editor', telemetryPayload);
			void externalHooks.run('expressionEdit.closeDialog', telemetryPayload);
		}
	},
);

watch(
	search,
	debounce(
		(newSearch: string) => {
			appliedSearch.value = newSearch;
		},
		{ debounceTime: 500 },
	),
);

function valueChanged(update: { value: string; segments: Segment[] }) {
	segments.value = update.segments;
}

function closeDialog() {
	emit('closeDialog');
}

function onDrop(expression: string) {
	expressionInputRef.value?.editor?.dispatch({
		changes: {
			from: dropPosition.value,
			to: dropPosition.value,
			insert: expression,
		},
	});
}
</script>

<style module lang="scss">
.modal {
	overflow: hidden;
	height: 80vh;

	:global(.el-dialog__body) {
		background-color: var(--color-expression-editor-modal-background);
		height: 100%;
		border-top: var(--border-base);
		padding-top: var(--spacing-l);
	}
}

.container {
	display: flex;
	flex-flow: row nowrap;
	gap: var(--spacing-s);
	height: 100%;
}

.schema {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
	flex-basis: 320px;
	flex-shrink: 0;
	height: 100%;
	overflow-y: auto;
}

.io {
	display: flex;
	flex-wrap: wrap;
	flex-grow: 1;
	gap: var(--spacing-s);

	:global(.cm-content) {
		height: 60vh;
	}
}

.input,
.output {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
	min-width: 300px;
	flex: 1;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-4xs);
}

.tip {
	min-height: 22px;
}

.drop {
	outline: 1px solid blue;
}

.activeDrop {
	outline: 1px solid red;
}
</style>
