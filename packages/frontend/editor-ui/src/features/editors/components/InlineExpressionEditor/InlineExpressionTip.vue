<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { FIELDS_SECTION } from '../../plugins/codemirror/completions/constants';
import { datatypeCompletions } from '../../plugins/codemirror/completions/datatype.completions';
import { isCompletionSection } from '../../plugins/codemirror/completions/utils';
import { useNDVStore } from '@/stores/ndv.store';
import { type Completion, CompletionContext } from '@codemirror/autocomplete';
import { EditorSelection, EditorState, type SelectionRange } from '@codemirror/state';
import { watchDebounced } from '@vueuse/core';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { N8nText } from '@n8n/design-system';
type TipId = 'executePrevious' | 'drag' | 'default' | 'dotObject' | 'dotPrimitive';

type Props = {
	editorState?: EditorState;
	unresolvedExpression?: string;
	selection?: SelectionRange;
};

const props = withDefaults(defineProps<Props>(), {
	editorState: undefined,
	unresolvedExpression: '',
	selection: () => EditorSelection.cursor(0),
});

const i18n = useI18n();
const ndvStore = useNDVStore();

const canAddDotToExpression = ref(false);
const resolvedExpressionHasFields = ref(false);

const canDragToFocusedInput = computed(
	() => !ndvStore.isInputPanelEmpty && ndvStore.focusedMappableInput,
);

const emptyExpression = computed(() => props.unresolvedExpression.trim().length === 0);

const tip = computed<TipId>(() => {
	if (
		!ndvStore.hasInputData &&
		ndvStore.isInputParentOfActiveNode &&
		ndvStore.focusedMappableInput
	) {
		return 'executePrevious';
	}

	if (canAddDotToExpression.value) {
		return resolvedExpressionHasFields.value ? 'dotObject' : 'dotPrimitive';
	}

	if (canDragToFocusedInput.value && emptyExpression.value) return 'drag';

	return 'default';
});

function getCompletionsWithDot(): readonly Completion[] {
	if (!props.editorState || !props.selection || !props.unresolvedExpression) {
		return [];
	}

	const cursorAfterDot = props.selection.from + 1;
	const docWithDot =
		props.editorState.sliceDoc(0, props.selection.from) +
		'.' +
		props.editorState.sliceDoc(props.selection.to);
	const selectionWithDot = EditorSelection.create([EditorSelection.cursor(cursorAfterDot)]);

	if (cursorAfterDot >= docWithDot.length) {
		return [];
	}

	const stateWithDot = EditorState.create({
		doc: docWithDot,
		selection: selectionWithDot,
	});

	const context = new CompletionContext(stateWithDot, cursorAfterDot, true);
	const completionResult = datatypeCompletions(context);
	return completionResult?.options ?? [];
}

onBeforeUnmount(() => {
	ndvStore.setHighlightDraggables(false);
});

watch(
	tip,
	(newTip) => {
		ndvStore.setHighlightDraggables(!ndvStore.isMappingOnboarded && newTip === 'drag');
	},
	{ immediate: true },
);

watchDebounced(
	[() => props.selection, () => props.unresolvedExpression],
	() => {
		const completions = getCompletionsWithDot();
		canAddDotToExpression.value = completions.length > 0;
		resolvedExpressionHasFields.value = completions.some(
			({ section }) => isCompletionSection(section) && section.name === FIELDS_SECTION.name,
		);
	},
	{ debounce: 200 },
);
</script>

<template>
	<div :class="[$style.tip, { [$style.drag]: tip === 'drag' }]">
		<N8nText size="small" :class="$style.tipText"
			>{{ i18n.baseText('parameterInput.tip') }}:
		</N8nText>

		<div v-if="tip === 'drag'" :class="$style.content">
			<N8nText size="small" :class="$style.text">
				{{ i18n.baseText('parameterInput.dragTipBeforePill') }}
			</N8nText>
			<div :class="[$style.pill, { [$style.highlight]: !ndvStore.isMappingOnboarded }]">
				{{ i18n.baseText('parameterInput.inputField') }}
			</div>
			<N8nText size="small" :class="$style.text">
				{{ i18n.baseText('parameterInput.dragTipAfterPill') }}
			</N8nText>
		</div>

		<div v-else-if="tip === 'executePrevious'" :class="$style.content">
			<span> {{ i18n.baseText('expressionTip.noExecutionData') }} </span>
		</div>

		<div v-else-if="tip === 'dotPrimitive'" :class="$style.content">
			<span v-n8n-html="i18n.baseText('expressionTip.typeDotPrimitive')" />
		</div>

		<div v-else-if="tip === 'dotObject'" :class="$style.content">
			<span v-n8n-html="i18n.baseText('expressionTip.typeDotObject')" />
		</div>

		<div v-else :class="$style.content">
			<span v-n8n-html="i18n.baseText('expressionTip.javascript')" />
		</div>
	</div>
</template>

<style lang="scss" module>
.tip {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	line-height: var(--line-height--md);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	padding: var(--spacing--2xs);

	code {
		font-size: var(--font-size--3xs);
		background: var(--color--background);
		padding: var(--spacing--5xs);
		border-radius: var(--radius);
	}
}

.content {
	display: inline-block;
}

.tipText {
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	align-self: flex-start;
}

.drag .tipText {
	line-height: 21px;
}

.text {
	display: inline;
}

.pill {
	display: inline-flex;
	align-items: center;
	color: var(--color--text--shade-1);

	border: var(--border);
	border-color: var(--color--foreground--tint-1);
	background-color: var(--color--background--light-3);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	margin: 0 var(--spacing--4xs);
	border-radius: var(--radius);
}

.highlight {
	color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
	border-color: var(--color--primary--tint-1);
}
</style>
