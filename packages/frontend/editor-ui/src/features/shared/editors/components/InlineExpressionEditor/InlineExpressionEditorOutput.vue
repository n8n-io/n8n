<script setup lang="ts">
import type { EditorState, SelectionRange } from '@codemirror/state';

import { useI18n } from '@n8n/i18n';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import type { Resolvable, Segment } from '@/app/types/expressions';
import { computed, onBeforeUnmount, useTemplateRef } from 'vue';
import ExpressionOutput from './ExpressionOutput.vue';
import OutputItemSelect from './OutputItemSelect.vue';
import InlineExpressionTip from './InlineExpressionTip.vue';
import { outputTheme } from './theme';
import { useStyles } from '@n8n/composables/useStyles';

import { N8nButton, N8nPopover, N8nText } from '@n8n/design-system';
interface InlineExpressionEditorOutputProps {
	segments: Segment[];
	unresolvedExpression?: string;
	editorState?: EditorState;
	selection?: SelectionRange;
	isReadOnly?: boolean;
	visible: boolean;
	virtualRef?: HTMLElement;
}

const props = withDefaults(defineProps<InlineExpressionEditorOutputProps>(), {
	editorState: undefined,
	selection: undefined,
	isReadOnly: false,
	unresolvedExpression: undefined,
});

const emit = defineEmits<{
	applySuggestion: [segment: Resolvable];
}>();

const diagnosisSegment = computed(() =>
	props.segments.find((s): s is Resolvable => s.kind === 'resolvable' && s.diagnosis !== undefined),
);
const diagnosis = computed(() => diagnosisSegment.value?.diagnosis);

function onFixClick() {
	if (diagnosisSegment.value) emit('applySuggestion', diagnosisSegment.value);
}

const i18n = useI18n();
const theme = outputTheme();
const ndvStore = injectNDVStore();
const contentRef = useTemplateRef('content');
const { APP_Z_INDEXES } = useStyles();

onBeforeUnmount(() => {
	ndvStore.value.expressionOutputItemIndex = 0;
});

defineExpose({
	contentRef,
});
</script>

<template>
	<N8nPopover
		:open="visible"
		side="bottom"
		:side-flip="false"
		:side-offset="0"
		align="start"
		:reference="virtualRef"
		width="var(--reka-popper-anchor-width)"
		:content-class="$style.popover"
		:enable-slide-in="false"
		:enable-scrolling="false"
		:suppress-auto-focus="true"
		:z-index="APP_Z_INDEXES.NDV + 1"
	>
		<template #content>
			<div ref="content" :class="[$style.dropdown, 'ignore-key-press-canvas']">
				<div :class="$style.header">
					<N8nText bold size="small" compact>
						{{ i18n.baseText('parameterInput.result') }}
					</N8nText>

					<OutputItemSelect />
				</div>
				<N8nText :class="$style.body">
					<ExpressionOutput
						data-test-id="inline-expression-editor-output"
						:segments="segments"
						:extensions="theme"
					>
					</ExpressionOutput>
				</N8nText>
				<div v-if="diagnosis" :class="$style.diagnosis" data-test-id="expression-diagnosis">
					<N8nText size="small" color="text-base">{{ diagnosis.message }}</N8nText>
					<div v-if="diagnosis.suggestion" :class="$style.suggestionRow">
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('expressionEditor.xray.didYouMean') }}
							<code :class="$style.suggestion">{{
								diagnosis.suggestionLabel ?? diagnosis.suggestion
							}}</code
							>?
						</N8nText>
						<N8nButton
							v-if="!isReadOnly"
							size="xsmall"
							variant="outline"
							data-test-id="expression-diagnosis-fix"
							@click="onFixClick"
						>
							{{ i18n.baseText('expressionEditor.xray.fix') }}
						</N8nButton>
					</div>
				</div>
				<div v-if="!isReadOnly" :class="$style.footer">
					<InlineExpressionTip
						:editor-state="editorState"
						:selection="selection"
						:unresolved-expression="unresolvedExpression"
					/>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.popover {
	border-top: none;
	border-top-left-radius: 0;
	border-top-right-radius: 0;
}

.dropdown {
	display: flex;
	flex-direction: column;
	background: var(--code--color--background);
	width: 100%;
	box-shadow: 0 2px 6px 0 rgba(#441c17, 0.1);
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;

	:global(.cm-editor) {
		background-color: var(--code--color--background);
	}

	.body {
		padding: var(--spacing--3xs);
		padding-top: 0;
		padding-left: var(--spacing--2xs);
		color: var(--color--text--shade-1);

		&:first-child {
			padding-top: var(--spacing--2xs);
		}
	}

	.footer {
		border-top: var(--border);
	}

	.diagnosis {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--4xs);
		border-top: var(--border);
		padding: var(--spacing--2xs);
	}

	.suggestionRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing--2xs);
	}

	.suggestion {
		font-size: var(--font-size--2xs);
		color: var(--color--text--shade-1);
		background: var(--color--background);
		padding: 0 var(--spacing--4xs);
		border-radius: var(--radius--3xs);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing--2xs);
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--bold);
		padding: 0 var(--spacing--2xs);
		padding-top: var(--spacing--2xs);
	}
}
</style>
