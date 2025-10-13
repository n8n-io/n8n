<script setup lang="ts">
import { useDebounce } from '@/composables/useDebounce';
import { useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/stores/ndv.store';
import type {
	AssignmentCollectionValue,
	AssignmentValue,
	FieldTypeMap,
	INode,
	INodeProperties,
} from 'n8n-workflow';
import { computed, inject, reactive, useTemplateRef, watch } from 'vue';
import DropArea from '../DropArea/DropArea.vue';
import ParameterOptions from '../ParameterOptions.vue';
import Assignment from './Assignment.vue';
import { inputDataToAssignments, typeFromExpression } from './utils';
import { propertyNameFromExpression } from '@/utils/mappingUtils';
import Draggable from 'vuedraggable';
import ExperimentalEmbeddedNdvMapper from '@/features/canvas/experimental/components/ExperimentalEmbeddedNdvMapper.vue';
import { ExpressionLocalResolveContextSymbol } from '@/constants';
import { useExperimentalNdvStore } from '@/features/canvas/experimental/experimentalNdv.store';

import { N8nInputLabel } from '@n8n/design-system';
interface Props {
	parameter: INodeProperties;
	value: AssignmentCollectionValue;
	path: string;
	defaultType?: keyof FieldTypeMap;
	disableType?: boolean;
	node: INode | null;
	isReadOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	isReadOnly: false,
	defaultType: undefined,
	disableType: false,
});

const emit = defineEmits<{
	valueChanged: [value: { name: string; node: string; value: AssignmentCollectionValue }];
}>();

const i18n = useI18n();
const expressionLocalResolveCtx = inject(ExpressionLocalResolveContextSymbol, undefined);
const dropAreaContainer = useTemplateRef('dropArea');

const state = reactive<{ paramValue: AssignmentCollectionValue }>({
	paramValue: {
		assignments:
			props.value.assignments?.map((assignment) => {
				if (!assignment.id) assignment.id = crypto.randomUUID();
				return assignment;
			}) ?? [],
	},
});

const ndvStore = useNDVStore();
const experimentalNdvStore = useExperimentalNdvStore();
const { callDebounced } = useDebounce();

const issues = computed(() => {
	if (!ndvStore.activeNode) return {};
	return ndvStore.activeNode?.issues?.parameters ?? {};
});

const empty = computed(() => state.paramValue.assignments.length === 0);
const activeDragField = computed(() => propertyNameFromExpression(ndvStore.draggableData));
const inputData = computed(() => ndvStore.ndvInputData?.[0]?.json);
const actions = computed(() => {
	return [
		{
			label: i18n.baseText('assignment.addAll'),
			value: 'addAll',
			disabled: !inputData.value,
		},
		{
			label: i18n.baseText('assignment.clearAll'),
			value: 'clearAll',
			disabled: state.paramValue.assignments.length === 0,
		},
	];
});

watch(state.paramValue, (value) => {
	void callDebounced(
		() => {
			emit('valueChanged', { name: props.path, value, node: props.node?.name as string });
		},
		{ debounceTime: 1000 },
	);
});

function addAssignment(): void {
	state.paramValue.assignments.push({
		id: crypto.randomUUID(),
		name: '',
		value: '',
		type: props.defaultType ?? 'string',
	});
}

function dropAssignment(expression: string): void {
	state.paramValue.assignments.push({
		id: crypto.randomUUID(),
		name: propertyNameFromExpression(expression),
		value: `=${expression}`,
		type: props.defaultType ?? typeFromExpression(expression),
	});
}

function onAssignmentUpdate(index: number, value: AssignmentValue): void {
	state.paramValue.assignments[index] = value;
}

function onAssignmentRemove(index: number): void {
	state.paramValue.assignments.splice(index, 1);
}

function getIssues(index: number): string[] {
	return issues.value[`${props.parameter.name}.${index}`] ?? [];
}

function optionSelected(action: string) {
	if (action === 'clearAll') {
		state.paramValue.assignments = [];
	} else if (action === 'addAll' && inputData.value) {
		const newAssignments = inputDataToAssignments(inputData.value);
		state.paramValue.assignments = state.paramValue.assignments.concat(newAssignments);
	}
}
</script>

<template>
	<div
		:class="{ [$style.assignmentCollection]: true, [$style.empty]: empty }"
		:data-test-id="`assignment-collection-${parameter.name}`"
	>
		<N8nInputLabel
			:label="parameter.displayName"
			:show-expression-selector="false"
			size="small"
			underline
			color="text-dark"
		>
			<template #options>
				<ParameterOptions
					:parameter="parameter"
					:value="value"
					:custom-actions="actions"
					:is-read-only="isReadOnly"
					:show-expression-selector="false"
					@update:model-value="optionSelected"
				/>
			</template>
		</N8nInputLabel>

		<ExperimentalEmbeddedNdvMapper
			v-if="
				experimentalNdvStore.isNdvInFocusPanelEnabled &&
				dropAreaContainer?.$el &&
				node &&
				expressionLocalResolveCtx?.inputNode
			"
			:workflow="expressionLocalResolveCtx.workflow"
			:node="node"
			:input-node-name="expressionLocalResolveCtx.inputNode.name"
			:reference="dropAreaContainer?.$el"
			visible-on-hover
		/>

		<div :class="$style.content">
			<div :class="$style.assignments">
				<Draggable
					v-model="state.paramValue.assignments"
					item-key="id"
					handle=".drag-handle"
					:drag-class="$style.dragging"
					:ghost-class="$style.ghost"
				>
					<template #item="{ index, element: assignment }">
						<Assignment
							:model-value="assignment"
							:index="index"
							:path="`${path}.assignments.${index}`"
							:issues="getIssues(index)"
							:class="$style.assignment"
							:is-read-only="isReadOnly"
							:disable-type="disableType"
							@update:model-value="(value) => onAssignmentUpdate(index, value)"
							@remove="() => onAssignmentRemove(index)"
						>
						</Assignment>
					</template>
				</Draggable>
			</div>
			<div
				v-if="!isReadOnly"
				:class="$style.dropAreaWrapper"
				data-test-id="assignment-collection-drop-area"
				@click="addAssignment"
			>
				<DropArea ref="dropArea" :sticky-offset="empty ? [-4, 32] : [92, 0]" @drop="dropAssignment">
					<template #default="{ active, droppable }">
						<div :class="{ [$style.active]: active, [$style.droppable]: droppable }">
							<div v-if="droppable" :class="$style.dropArea">
								<span>{{ i18n.baseText('assignment.dropField') }}</span>
								<span :class="$style.activeField">{{ activeDragField }}</span>
							</div>
							<div v-else :class="$style.dropArea">
								<span>{{ i18n.baseText('assignment.dragFields') }}</span>
								<span :class="$style.or">{{ i18n.baseText('assignment.or') }}</span>
								<span :class="$style.add">{{ i18n.baseText('assignment.add') }} </span>
							</div>
						</div>
					</template>
				</DropArea>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.assignmentCollection {
	display: flex;
	flex-direction: column;
	margin: var(--spacing--xs) 0;
}

.content {
	display: flex;
	gap: var(--spacing--lg);
	flex-direction: column;
}

.assignments {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.assignment {
	padding-left: var(--spacing--lg);
}

.dropAreaWrapper {
	cursor: pointer;

	&:not(.empty .dropAreaWrapper) {
		padding-left: var(--spacing--lg);
	}

	&:hover .add {
		color: var(--color--primary--shade-1);
	}
}

.dropArea {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	justify-content: center;
	font-size: var(--font-size--xs);
	color: var(--color--text--shade-1);
	gap: 1ch;
	min-height: 24px;

	> span {
		word-wrap: break-word;
		overflow-wrap: break-word;
		word-break: break-word;
		white-space: normal;
		max-width: 100%;
	}
}

.or {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}

.add {
	color: var(--color--primary);
	font-weight: var(--font-weight--bold);
}

.activeField {
	font-weight: var(--font-weight--bold);
	color: var(--color-ndv-droppable-parameter);
}

.active {
	.activeField {
		color: var(--color--success);
	}
}

.empty {
	.dropArea {
		flex-direction: column;
		align-items: center;
		gap: var(--spacing--3xs);
		min-height: 20vh;
	}

	.droppable .dropArea {
		flex-direction: row;
		gap: 1ch;
	}

	.content {
		gap: var(--spacing--sm);
	}
}

.icon {
	font-size: var(--font-size--2xl);
}
.ghost,
.dragging {
	border-radius: var(--radius);
	padding-right: var(--spacing--xs);
	padding-bottom: var(--spacing--xs);
}
.ghost {
	background-color: var(--color--background);
	opacity: 0.5;
}
.dragging {
	background-color: var(--color--background--light-3);
	opacity: 0.7;
}
</style>
