<script setup lang="ts">
import {
	type AssignmentCollectionValue,
	type AssignmentValue,
	type INode,
	type INodeProperties,
} from 'n8n-workflow';
import { useI18n } from '@/composables/useI18n';
import { computed, reactive, watch } from 'vue';
import { useNDVStore } from '@/stores/ndv.store';
import DropArea from '../DropArea/DropArea.vue';
import Assignment from './Assignment.vue';
import { v4 as uuid } from 'uuid';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { isObject } from 'lodash-es';
import { useDebounce } from '@/composables/useDebounce';

interface Props {
	parameter: INodeProperties;
	value: AssignmentCollectionValue;
	path: string;
	node: INode | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	(
		event: 'valueChanged',
		value: { name: string; node: string; value: AssignmentCollectionValue },
	): void;
}>();

const i18n = useI18n();

const state = reactive<{ paramValue: AssignmentCollectionValue }>({
	paramValue: {
		assignments: props.value.assignments ?? [],
	},
});

const ndvStore = useNDVStore();
const { callDebounced } = useDebounce();

const issues = computed(() => {
	if (!ndvStore.activeNode) return {};
	return ndvStore.activeNode?.issues?.parameters ?? {};
});

const empty = computed(() => state.paramValue.assignments.length === 0);

watch(state.paramValue, (value) => {
	void callDebounced(
		() => {
			emit('valueChanged', { name: props.path, value, node: props.node?.name as string });
		},
		{ debounceTime: 1000 },
	);
});

function nameFromExpression(expression: string): string {
	return (
		expression
			.replace(/^{{\s*|\s*}}$/g, '')
			.split('.')
			.pop() ?? 'name'
	);
}

function inferAssignmentType(value: unknown): string {
	if (typeof value === 'boolean') return 'boolean';
	if (typeof value === 'number') return 'number';
	if (typeof value === 'string') return 'string';
	if (Array.isArray(value)) return 'array';
	if (isObject(value)) return 'object';
	return 'string';
}

function typeFromExpression(expression: string): string {
	try {
		const resolved = resolveParameter(`=${expression}`);
		return inferAssignmentType(resolved);
	} catch (error) {
		return 'string';
	}
}

function addAssignment(): void {
	state.paramValue.assignments.push({ id: uuid(), name: '', value: '', type: 'string' });
}

function dropAssignment(expression: string): void {
	state.paramValue.assignments.push({
		id: uuid(),
		name: nameFromExpression(expression),
		value: `=${expression}`,
		type: typeFromExpression(expression),
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
</script>

<template>
	<div
		:class="{ [$style.assignmentCollection]: true, [$style.empty]: empty }"
		:data-test-id="`assignment-collection-${parameter.name}`"
	>
		<n8n-input-label
			:label="parameter.displayName"
			:show-expression-selector="false"
			size="small"
			show-options
			underline
			color="text-dark"
		>
		</n8n-input-label>
		<div :class="$style.content">
			<div :class="$style.assignments">
				<div v-for="(assignment, index) of state.paramValue.assignments" :key="assignment.id">
					<Assignment
						:model-value="assignment"
						:index="index"
						:path="`${path}.${index}`"
						:issues="getIssues(index)"
						:class="$style.assignment"
						@update:model-value="(value) => onAssignmentUpdate(index, value)"
						@remove="() => onAssignmentRemove(index)"
					>
					</Assignment>
				</div>
			</div>
			<div :class="$style.dropAreaWrapper">
				<DropArea :sticky-offset="empty ? [-4, 32] : [92, 0]" @drop="dropAssignment">
					<template #default="{ active }">
						<div
							:class="{
								[$style.dropArea]: true,
								[$style.active]: active,
							}"
						>
							<font-awesome-icon v-if="empty" :class="$style.icon" icon="plus-circle" />
							<span>{{
								i18n.baseText(active ? 'assignment.dropField' : 'assignment.dragFields')
							}}</span>
							<span :class="$style.or">{{ i18n.baseText('assignment.or') }}</span>
							<n8n-button :class="$style.addButton" size="large" text @click="addAssignment">
								{{ i18n.baseText('assignment.add') }}
							</n8n-button>
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
	margin: var(--spacing-xs) 0;
}

.content {
	display: flex;
	gap: var(--spacing-l);
	flex-direction: column;
}

.assignments {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-4xs);
}

.assignment {
	padding-left: var(--spacing-l);
}

.dropAreaWrapper:not(.empty .dropAreaWrapper) {
	padding-left: var(--spacing-l);
}

.dropArea {
	display: flex;
	align-items: baseline;
	justify-content: center;
	font-size: var(--font-size-s);
	gap: 0.5ch;
}

.active {
	pointer-events: none;

	.or,
	.addButton {
		opacity: 0;
	}
}

.empty {
	.dropArea {
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-2xs);
	}

	.content {
		gap: var(--spacing-s);
	}
}

.icon {
	font-size: var(--font-size-2xl);
}

.addButton {
	padding: 0;
}
</style>
