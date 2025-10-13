<script setup lang="ts">
import type { EditorState, SelectionRange } from '@codemirror/state';

import { useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/stores/ndv.store';
import type { Segment } from '@/types/expressions';
import { onBeforeUnmount, useTemplateRef } from 'vue';
import ExpressionOutput from './ExpressionOutput.vue';
import OutputItemSelect from './OutputItemSelect.vue';
import InlineExpressionTip from './InlineExpressionTip.vue';
import { outputTheme } from './theme';
import { useStyles } from '@/composables/useStyles';

import { N8nPopoverReka, N8nText } from '@n8n/design-system';
interface InlineExpressionEditorOutputProps {
	segments: Segment[];
	unresolvedExpression?: string;
	editorState?: EditorState;
	selection?: SelectionRange;
	isReadOnly?: boolean;
	visible: boolean;
	virtualRef?: HTMLElement;
}

withDefaults(defineProps<InlineExpressionEditorOutputProps>(), {
	editorState: undefined,
	selection: undefined,
	isReadOnly: false,
	unresolvedExpression: undefined,
});

const i18n = useI18n();
const theme = outputTheme();
const ndvStore = useNDVStore();
const contentRef = useTemplateRef('content');
const { APP_Z_INDEXES } = useStyles();

onBeforeUnmount(() => {
	ndvStore.expressionOutputItemIndex = 0;
});

defineExpose({
	contentRef,
});
</script>

<template>
	<N8nPopoverReka
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
				<div v-if="!isReadOnly" :class="$style.footer">
					<InlineExpressionTip
						:editor-state="editorState"
						:selection="selection"
						:unresolved-expression="unresolvedExpression"
					/>
				</div>
			</div>
		</template>
	</N8nPopoverReka>
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
	background: var(--color-code-background);
	width: 100%;
	box-shadow: 0 2px 6px 0 rgba(#441c17, 0.1);
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;

	:global(.cm-editor) {
		background-color: var(--color-code-background);
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
