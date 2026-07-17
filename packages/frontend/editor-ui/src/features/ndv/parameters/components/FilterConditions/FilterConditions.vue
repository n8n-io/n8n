<script setup lang="ts">
import isEqual from 'lodash/isEqual';

import {
	type FilterConditionValue,
	type FilterOptionsValue,
	type FilterValue,
	type INodeProperties,
	type FilterTypeCombinator,
	type INode,
	type NodeParameterValue,
} from 'n8n-workflow';
import { computed, reactive, ref, watch, watchEffect } from 'vue';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import {
	DEFAULT_FILTER_OPTIONS,
	DEFAULT_MAX_CONDITIONS,
	DEFAULT_OPERATOR_VALUE,
} from './constants';
import { useI18n } from '@n8n/i18n';
import { useDebounce } from '@/app/composables/useDebounce';
import Condition from './Condition.vue';
import CombinatorSelect from './CombinatorSelect.vue';
import { resolveParameter } from '@/app/composables/useWorkflowHelpers';
import Draggable from 'vuedraggable';

import { N8nButton, N8nInputLabel } from '@n8n/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
interface Props {
	parameter: INodeProperties;
	value: FilterValue;
	path: string;
	node: INode | null;
	readOnly?: boolean;
	removeFirstMargin?: boolean;
	removeLastMargin?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	readOnly: false,
	removeFirstMargin: false,
	removeLastMargin: false,
});

type ParameterValueType = FilterValue | boolean | undefined;

const emit = defineEmits<{
	valueChanged: [
		value: {
			name: string;
			node: string;
			value: ParameterValueType;
		},
	];
}>();

const i18n = useI18n();
const ndvStore = injectNDVStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const { debounce } = useDebounce();

const debouncedEmitChange = debounce(emitChange, { debounceTime: 1000 });

function createCondition(): FilterConditionValue {
	return {
		id: crypto.randomUUID(),
		leftValue: '',
		rightValue: '',
		operator: DEFAULT_OPERATOR_VALUE,
	};
}

const allowedCombinators = computed<FilterTypeCombinator[]>(
	() => props.parameter.typeOptions?.filter?.allowedCombinators ?? ['and', 'or'],
);

function createParamValue(value: FilterValue | undefined): FilterValue {
	return {
		options: value?.options ?? DEFAULT_FILTER_OPTIONS,
		conditions: value?.conditions?.map((condition) => ({
			...condition,
			id: condition.id || crypto.randomUUID(),
		})) ?? [createCondition()],
		combinator: value?.combinator ?? allowedCombinators.value[0],
	};
}

const state = reactive<{ paramValue: FilterValue }>({
	paramValue: createParamValue(props.value),
});

// Track the last resolved options to detect actual expression changes (vs initial load)
const lastResolvedOptions = ref<FilterOptionsValue | null>(null);

// Matches negated single-param patterns like ={{!$parameter.options.ignoreCase}}, or null (safe no-op).
function extractSourceParamPath(expr: unknown): string | null {
	if (typeof expr !== 'string') return null;
	const match = expr.match(/^=\{\{\s*!\s*\$parameter\.([\w.]+)\s*\}\}$/);
	return match ? match[1] : null;
}

const maxConditions = computed(
	() => props.parameter.typeOptions?.filter?.maxConditions ?? DEFAULT_MAX_CONDITIONS,
);

const singleCondition = computed(() => props.parameter.typeOptions?.multipleValues === false);

const maxConditionsReached = computed(
	() => maxConditions.value <= state.paramValue.conditions.length,
);

const issues = computed(() => {
	if (!ndvStore.value.activeNode) return {};
	return ndvStore.value.activeNode?.issues?.parameters ?? {};
});

watchEffect(async () => {
	// Reference props.node?.parameters to ensure reactivity tracking
	void props.node?.parameters;

	const typeOptions = props.parameter.typeOptions?.filter;

	if (!typeOptions) {
		return;
	}

	let newOptions: FilterOptionsValue = DEFAULT_FILTER_OPTIONS;
	try {
		newOptions = {
			...DEFAULT_FILTER_OPTIONS,
			...(await resolveParameter(
				typeOptions as unknown as NodeParameterValue,
				workflowDocumentStore.value.documentId,
			)),
		};
	} catch {
		// Keep default options
	}

	// On initial load, preserve stored options that differ from the resolved expression.
	// This prevents clobbering manually-set values and silent emissions on first render.
	// On subsequent loads, only update if the resolved options actually changed.
	const isInitialLoad = lastResolvedOptions.value === null;
	const resolvedOptionsChanged = !isEqual(lastResolvedOptions.value, newOptions);

	lastResolvedOptions.value = newOptions;

	if (isInitialLoad) {
		// If stored caseSensitive diverges from the resolved expression value,
		// emit a correction to sync the source toggle (harm A fix).
		const storedCaseSensitive = state.paramValue.options.caseSensitive;
		if (
			// Never mutate a read-only workflow just by viewing it.
			!props.readOnly &&
			storedCaseSensitive !== undefined &&
			storedCaseSensitive !== newOptions.caseSensitive &&
			typeof typeOptions.caseSensitive === 'string'
		) {
			// Extract source param path from expression (e.g., "options.ignoreCase" from "={{!$parameter.options.ignoreCase}}")
			const sourceParamPath = extractSourceParamPath(typeOptions.caseSensitive);
			if (sourceParamPath) {
				// Emit correction to sync source toggle: set ignoreCase = !storedCaseSensitive so that
				// the expression !ignoreCase re-resolves to storedCaseSensitive, making the UI truthful.
				// Include "parameters." prefix for correct routing through NodeSettings handler.
				// Tradeoff: node becomes dirty on open, but runtime behavior is preserved.
				emit('valueChanged', {
					name: `parameters.${sourceParamPath}`,
					node: props.node?.name || '',
					value: !storedCaseSensitive,
				});
			}
		}
		// Preserve any stored options on initial load, but note the resolved value for future comparison
		return;
	}

	if (resolvedOptionsChanged) {
		state.paramValue.options = newOptions;
		debouncedEmitChange();
	}
});

watch(
	() => props.value,
	(value) => {
		const newParamValue = createParamValue(value);
		if (isEqual(state.paramValue, newParamValue)) return;

		state.paramValue = newParamValue;
	},
);

watch(
	() => state.paramValue,
	() => {
		debouncedEmitChange();
	},
	{ deep: true },
);

function emitChange() {
	emit('valueChanged', {
		name: props.path,
		value: state.paramValue,
		node: props.node?.name as string,
	});
}

function addCondition(): void {
	state.paramValue.conditions.push(createCondition());
}

function onConditionUpdate(index: number, value: FilterConditionValue): void {
	state.paramValue.conditions[index] = value;
}

function onCombinatorChange(combinator: FilterTypeCombinator): void {
	state.paramValue.combinator = combinator;
}

function onConditionRemove(index: number): void {
	state.paramValue.conditions.splice(index, 1);
}

function getIssues(index: number): string[] {
	return issues.value[`${props.parameter.name}.${index}`] ?? [];
}
</script>

<template>
	<div
		:class="{
			[$style.filter]: true,
			[$style.single]: singleCondition,
			[$style.noTopMargin]: removeFirstMargin,
			[$style.noBottomMargin]: removeLastMargin,
		}"
		:data-test-id="`filter-${parameter.name}`"
	>
		<N8nInputLabel
			v-if="!singleCondition"
			:label="parameter.displayName"
			:underline="true"
			:show-options="true"
			:show-expression-selector="false"
			size="small"
			color="text-dark"
		>
		</N8nInputLabel>
		<div :class="$style.content">
			<div :class="$style.conditions">
				<Draggable
					v-model="state.paramValue.conditions"
					item-key="id"
					handle=".drag-handle"
					:drag-class="$style.dragging"
					:ghost-class="$style.ghost"
				>
					<template #item="{ index, element: condition }">
						<div>
							<CombinatorSelect
								v-if="index !== 0"
								:read-only="index !== 1 || readOnly"
								:options="allowedCombinators"
								:selected="state.paramValue.combinator"
								:class="$style.combinator"
								@combinator-change="onCombinatorChange"
							/>

							<Condition
								:condition="condition"
								:index="index"
								:options="state.paramValue.options"
								:fixed-left-value="!!parameter.typeOptions?.filter?.leftValue"
								:read-only="readOnly"
								:can-remove="index !== 0 || state.paramValue.conditions.length > 1"
								:can-drag="index !== 0 || state.paramValue.conditions.length > 1"
								:path="`${path}.conditions.${index}`"
								:issues="getIssues(index)"
								:class="$style.condition"
								@update="(value) => onConditionUpdate(index, value)"
								@remove="() => onConditionRemove(index)"
							></Condition>
						</div>
					</template>
				</Draggable>
			</div>
			<div v-if="!singleCondition && !readOnly" :class="$style.addConditionWrapper">
				<N8nButton
					class="n8n-button--highlightFill"
					variant="subtle"
					icon="plus"
					:label="i18n.baseText('filter.addCondition')"
					:title="maxConditionsReached ? i18n.baseText('filter.maxConditions') : ''"
					:disabled="maxConditionsReached"
					data-test-id="filter-add-condition"
					@click="addCondition"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.filter {
	display: flex;
	flex-direction: column;
	margin: var(--spacing--xs) 0;

	&.noTopMargin {
		margin-top: 0;
	}

	&.noBottomMargin {
		margin-bottom: 0;
	}
}

.filter:not(.single) .content {
	margin-top: var(--spacing--xs);
}

.conditions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.combinator {
	position: relative;
	z-index: 1;
	margin-top: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
	margin-left: var(--spacing--lg);
}

.condition {
	padding-left: var(--spacing--lg);
}

.single {
	.condition {
		padding-left: 0;
	}
}

.addConditionWrapper {
	margin-top: var(--spacing--xs);
	margin-left: var(--spacing--lg);
}
.ghost,
.dragging {
	border-radius: var(--radius);
	padding-right: var(--spacing--xs);
}
.ghost {
	background-color: var(--color--background);
	opacity: 0.5;
}
.dragging {
	background-color: var(--color--background--light-3);
	opacity: 0.7;
}
.dragging > .combinator {
	display: none;
}
</style>
