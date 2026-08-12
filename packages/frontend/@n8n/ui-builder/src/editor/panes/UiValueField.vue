<script setup lang="ts">
import { N8nInput, N8nInputLabel, N8nPopover } from '@n8n/design-system';
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
import { computed, inject, ref, useTemplateRef } from 'vue';

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
import { UiTooltipParentKey } from '../host';

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
	/**
	 * For a value that is only ever an expression — a request body, say. The
	 * mode switch goes, since there is no other mode to be in.
	 */
	alwaysExpression?: boolean;
}>();

const emit = defineEmits<{ update: [value: unknown] }>();

const segments = ref<Segment[]>([]);
const theme = outputTheme();

// Both follow the NDV: the mode switch appears while the field is under the
// pointer or has focus, the preview only while the editor is being used.
const anchor = useTemplateRef<HTMLElement>('anchor');
const isFocused = ref(false);
const isFieldHovered = ref(false);
const areOptionsVisible = computed(() => isFieldHovered.value || isFocused.value);
const isPreviewOpen = computed(() => isFocused.value);

/** Focus moving between the editor's own elements is not a blur. */
function onFocusOut(event: FocusEvent) {
	const next = event.relatedTarget;
	if (next instanceof Node && anchor.value?.contains(next)) return;

	isFocused.value = false;
}

const raw = computed(() => {
	const value = props.modelValue;
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value) ?? '';
});
const mode = computed<ExpressionMode>(() =>
	props.alwaysExpression || isExpression(props.modelValue) ? 'expression' : 'fixed',
);

/**
 * The editor holds what is inside the `=`, and a value forced into expression
 * mode may not carry one yet.
 */
const expressionSource = computed(() =>
	raw.value.startsWith('=') ? raw.value.slice(1) : raw.value,
);

const scope = computed(() => props.scope);
const resolver = uiScopeResolver(() => scope.value);
const completionSources = [uiScopeCompletions(() => scope.value)];
const tooltipParent = inject(UiTooltipParentKey, () => undefined);

/** The three kinds this format adds are stored as plain strings, and convert like one. */
const parameterType = computed<NodePropertyTypes>(() => {
	const { type } = props.descriptor;
	return type === ACTION_PROP_TYPE || type === STATE_PATH_PROP_TYPE || type === ROUTE_PROP_TYPE
		? 'string'
		: type;
});

const placeholder = computed(
	() =>
		props.descriptor.placeholder ??
		(parameterType.value === 'number' ? '={{ $state.count }}' : '={{ $state.title }}'),
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
	<N8nInputLabel
		:label="descriptor.displayName"
		:tooltip-text="descriptor.description"
		:show-tooltip="Boolean(descriptor.description)"
		:show-options="areOptionsVisible && !alwaysExpression"
		:bold="false"
		size="small"
		color="text-dark"
		@mouseenter="isFieldHovered = true"
		@mouseleave="isFieldHovered = false"
	>
		<template v-if="!alwaysExpression" #options>
			<ExpressionModeToggle
				:model-value="mode"
				:disabled="disabled"
				@update:model-value="onModeChange"
			/>
		</template>

		<div class="ui-value-field" :class="{ 'ui-value-field--preview-open': isPreviewOpen }">
			<N8nInput
				v-if="mode === 'fixed'"
				:model-value="raw"
				:disabled="disabled"
				size="small"
				:placeholder="placeholder"
				@paste="onPaste"
				@focus="isFocused = true"
				@blur="isFocused = false"
				@update:model-value="onFixedInput"
			/>

			<template v-else>
				<div
					ref="anchor"
					class="ui-value-field__editor"
					@focusin="isFocused = true"
					@focusout="onFocusOut"
				>
					<ExpressionEditorInput
						:model-value="expressionSource"
						:resolver="resolver"
						:completion-sources="completionSources"
						:is-read-only="disabled"
						:rows="3"
						:tooltip-parent="tooltipParent()"
						data-test-id="ui-builder-expression-input"
						@update:model-value="
							(update) => {
								segments = update.segments;
								emit('update', update.value);
							}
						"
					/>
				</div>

				<N8nPopover
					:open="isPreviewOpen"
					:reference="anchor ?? undefined"
					side="bottom"
					:side-flip="false"
					:side-offset="0"
					align="start"
					width="var(--reka-popper-anchor-width)"
					:enable-slide-in="false"
					:enable-scrolling="false"
					:suppress-auto-focus="true"
					content-class="ui-value-field__popover"
					:z-index="'calc(var(--dialogs--z, 1950) + 1)'"
				>
					<template #content>
						<div class="ui-value-field__preview">
							<ExpressionOutput :segments="segments" :extensions="theme" />
						</div>
					</template>
				</N8nPopover>
			</template>
		</div>
	</N8nInputLabel>
</template>

<style scoped>
.ui-value-field {
	display: flex;
	flex-direction: column;

	/* Rounded all round: no `f(x)` section sits to the left as in the NDV. */
	--input-triple--radius--top-left: var(--input--radius, var(--radius));
	--input-triple--radius--bottom-left: var(--input--radius, var(--radius));
	/* Editor and preview share the code surface, as the NDV's do. */
	--expression-editor--color--background: var(--code--color--background);
}

/* The preview hangs off the bottom edge, so the input gives up its corners. */
.ui-value-field--preview-open {
	--input-triple--radius--bottom-left: 0;
	--input-triple--radius--bottom-right: 0;
}

.ui-value-field__preview {
	/* Teleported out of the field, so the popover surface is the backdrop here. */
	--expression-editor--color--background: transparent;
	padding: var(--spacing--2xs);
	overflow: hidden;
}
</style>

<style>
/* The popover content is teleported, and never carries the scope attribute. */
.ui-value-field__popover {
	border-top-left-radius: 0;
	border-top-right-radius: 0;
}
</style>
