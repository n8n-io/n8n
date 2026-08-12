<script setup lang="ts">
import { N8nInput } from '@n8n/design-system';
import {
	completeExpressionSyntax,
	ExpressionEditorInput,
	ExpressionModeToggle,
	ExpressionOutput,
	formatAsExpression,
	isExpression,
	outputTheme,
	parseFromExpression,
	shouldConvertToExpression,
	type ExpressionMode,
	type Segment,
} from '@n8n/expression-editor';
import type { NodeParameterValueType, NodePropertyTypes } from 'n8n-workflow';
import { computed, ref } from 'vue';

import { resolveValue } from '../../core/expressions';
import {
	ACTION_PROP_TYPE,
	ROUTE_PROP_TYPE,
	STATE_PATH_PROP_TYPE,
	type UiProperty,
	type UiScope,
} from '../../core/types';
import { uiScopeCompletions } from '../expressions/scope-completions';
import { uiScopeResolver } from '../expressions/scope-resolver';

/**
 * One value prop, in either mode. The n8n expression editor, pointed at the
 * scope the canvas is rendering in rather than at a workflow's run data.
 */
defineOptions({ name: 'UiValueField' });

const props = defineProps<{
	descriptor: UiProperty;
	modelValue: unknown;
	scope: UiScope;
	disabled?: boolean;
}>();

const emit = defineEmits<{ update: [value: unknown] }>();

const segments = ref<Segment[]>([]);
const theme = outputTheme();

const raw = computed(() => {
	const value = props.modelValue;
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value) ?? '';
});
const mode = computed<ExpressionMode>(() =>
	isExpression(props.modelValue) ? 'expression' : 'fixed',
);

const scope = computed(() => props.scope);
const resolver = uiScopeResolver(() => scope.value);
const completionSources = [uiScopeCompletions(() => scope.value)];

/** The three kinds this format adds are stored as plain strings, and convert like one. */
const parameterType = computed<NodePropertyTypes>(() => {
	const { type } = props.descriptor;
	return type === ACTION_PROP_TYPE || type === STATE_PATH_PROP_TYPE || type === ROUTE_PROP_TYPE
		? 'string'
		: type;
});

const placeholder = computed(() =>
	parameterType.value === 'number' ? '={{ $state.count }}' : '={{ $state.title }}',
);

function onFixedInput(value: string) {
	const converted = !raw.value && shouldConvertToExpression(value) ? '=' + value : value;
	emit('update', completeExpressionSyntax(converted));
}

// Pasting a value that starts with `=` but holds no `{{ }}` should keep the `=`
// as text, which takes a second one to say "and this is an expression".
function onPaste(event: ClipboardEvent) {
	const pasted = event.clipboardData?.getData('text');
	const input = event.target;

	if (!pasted || !(input instanceof HTMLInputElement)) return;

	const start = input.selectionStart ?? 0;

	if (pasted.startsWith('=') && !/{{.*?}}/.test(pasted) && start === 0) {
		event.preventDefault();
		const end = input.selectionEnd ?? start;
		input.value = input.value.slice(0, start) + '=' + pasted + input.value.slice(end);
		onFixedInput(input.value);
	}
}

function onModeChange(next: ExpressionMode) {
	if (next === mode.value) return;

	const value = props.modelValue as NodeParameterValueType;

	if (next === 'expression') {
		emit('update', formatAsExpression(value, parameterType.value));
		return;
	}

	emit(
		'update',
		parseFromExpression(
			value,
			resolveValue(props.modelValue, props.scope),
			parameterType.value,
			(props.descriptor.default ?? null) as NodeParameterValueType,
		),
	);
}
</script>

<template>
	<div class="ui-value-field">
		<div class="ui-value-field__header">
			<ExpressionModeToggle
				:model-value="mode"
				:disabled="disabled"
				@update:model-value="onModeChange"
			/>
		</div>

		<N8nInput
			v-if="mode === 'fixed'"
			:model-value="raw"
			:disabled="disabled"
			size="small"
			:placeholder="placeholder"
			@paste="onPaste"
			@update:model-value="onFixedInput"
		/>

		<template v-else>
			<ExpressionEditorInput
				:model-value="raw.slice(1)"
				:resolver="resolver"
				:completion-sources="completionSources"
				:is-read-only="disabled"
				:rows="3"
				data-test-id="ui-builder-expression-input"
				@update:model-value="
					(update) => {
						segments = update.segments;
						emit('update', update.value);
					}
				"
			/>

			<div class="ui-value-field__preview">
				<ExpressionOutput :segments="segments" :extensions="theme" />
			</div>
		</template>
	</div>
</template>

<style scoped>
.ui-value-field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.ui-value-field__header {
	display: flex;
	justify-content: flex-end;
}

.ui-value-field__preview {
	border: var(--border);
	border-top: none;
	border-bottom-left-radius: var(--radius);
	border-bottom-right-radius: var(--radius);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: var(--code--color--background);
	overflow: hidden;
}
</style>
