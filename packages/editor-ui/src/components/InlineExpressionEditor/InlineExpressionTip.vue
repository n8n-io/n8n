<template>
	<div :class="[$style.tip, { [$style.drag]: tip === 'drag' }]">
		<n8n-text size="small" :class="$style.tipText"
			>{{ i18n.baseText('parameterInput.tip') }}:
		</n8n-text>

		<div v-if="tip === 'drag'" :class="$style.content">
			<n8n-text size="small" :class="$style.text">
				{{ i18n.baseText('parameterInput.dragTipBeforePill') }}
			</n8n-text>
			<div :class="[$style.pill, { [$style.highlight]: !ndvStore.isMappingOnboarded }]">
				{{ i18n.baseText('parameterInput.inputField') }}
			</div>
			<n8n-text size="small" :class="$style.text">
				{{ i18n.baseText('parameterInput.dragTipAfterPill') }}
			</n8n-text>
		</div>

		<div v-else-if="tip === 'executePrevious'" :class="$style.content">
			<span> {{ i18n.baseText('expressionTip.noExecutionData') }} </span>
		</div>

		<div v-else-if="tip === 'dot'" :class="$style.content">
			<span v-html="i18n.baseText('expressionTip.typeDot')" />
		</div>

		<div v-else :class="$style.content">
			<span v-html="i18n.baseText('expressionTip.javascript')" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useNDVStore } from '@/stores/ndv.store';
import { computed, ref, watch } from 'vue';
import { EditorSelection, EditorState, type SelectionRange } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { datatypeCompletions } from '@/plugins/codemirror/completions/datatype.completions';

type Props = {
	tip?: 'drag' | 'default' | 'dot' | 'auto';
	unresolvedExpression?: string;
	editorState?: EditorState;
	selection?: SelectionRange;
};

const props = withDefaults(defineProps<Props>(), {
	unresolvedExpression: '',
	tip: 'auto',
	editorState: undefined,
	selection: () => EditorSelection.cursor(0),
});

const i18n = useI18n();
const ndvStore = useNDVStore();

const canAddDotToExpression = ref(false);

const emptyExpression = computed(() => props.unresolvedExpression.trim().length === 0);

const canDragToFocusedInput = computed(
	() => !ndvStore.isDNVDataEmpty('input') && ndvStore.focusedMappableInput,
);

const tip = computed(() => {
	if (!ndvStore.hasInputData) {
		return 'executePrevious';
	}

	if (props.tip !== 'auto') return props.tip;

	if (canAddDotToExpression.value) return 'dot';

	if (canDragToFocusedInput.value && emptyExpression.value) return 'drag';

	return 'default';
});

watch(tip, (newTip) => {
	ndvStore.setHighlightDraggables(!ndvStore.isMappingOnboarded && newTip === 'drag');
});

watch(
	() => props.selection,
	() => {
		if (
			!props.editorState ||
			!props.selection ||
			!props.selection.empty ||
			props.unresolvedExpression.endsWith('.')
		) {
			canAddDotToExpression.value = false;
			return;
		}

		const cursor = props.selection.anchor;
		const cursorAfterDot = cursor + 1;
		const docWithDot =
			props.editorState.sliceDoc(0, cursor) + '.' + props.editorState.sliceDoc(cursor);
		const selectionWithDot = EditorSelection.create([EditorSelection.cursor(cursorAfterDot)]);
		const stateWithDot = EditorState.create({
			doc: docWithDot,
			selection: selectionWithDot,
		});

		const context = new CompletionContext(stateWithDot, cursorAfterDot, true);

		const result = datatypeCompletions(context);
		canAddDotToExpression.value = !!result && result.options.length > 0;
	},
);
</script>

<style lang="scss" module>
.tip {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing-4xs);
	line-height: var(--font-line-height-regular);
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
	padding: var(--spacing-2xs);
}

.content {
	display: inline-block;
}

.tipText {
	display: inline;
	color: var(--color-text-dark);
	font-weight: var(--font-weight-bold);
}

.drag .tipText {
	line-height: 21px;
}

.text {
	display: inline;
}

code {
	font-size: var(--font-size-3xs);
	background: var(--color-background-base);
	padding: var(--spacing-5xs);
	border-radius: var(--border-radius-base);
}

.pill {
	display: inline-flex;
	align-items: center;
	color: var(--color-text-dark);

	border: var(--border-base);
	border-color: var(--color-foreground-light);
	background-color: var(--color-background-xlight);
	padding: var(--spacing-5xs) var(--spacing-3xs);
	margin: 0 var(--spacing-4xs);
	border-radius: var(--border-radius-base);
}

.highlight {
	color: var(--color-primary);
	background-color: var(--color-primary-tint-3);
	border-color: var(--color-primary-tint-1);
}
</style>
