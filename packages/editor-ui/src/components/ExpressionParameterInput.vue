<template>
	<div :class="$style['expression-parameter-input']" v-click-outside="onBlur" @keydown.tab="onBlur">
		<div :class="[$style['all-sections'], { [$style['focused']]: isFocused }]">
			<div
				:class="[
					$style['prepend-section'],
					'el-input-group__prepend',
					{ [$style['squared']]: isForRecordLocator },
				]"
			>
				<ExpressionFunctionIcon />
			</div>
			<InlineExpressionEditorInput
				:value="value"
				:isReadOnly="isReadOnly"
				:targetItem="hoveringItem"
				:isSingleLine="isForRecordLocator"
				:path="path"
				@focus="onFocus"
				@blur="onBlur"
				@change="onChange"
				ref="inlineInput"
			/>
			<n8n-icon
				v-if="!isDragging"
				icon="external-link-alt"
				size="xsmall"
				:class="$style['expression-editor-modal-opener']"
				@click="$emit('modalOpenerClick')"
				data-test-id="expander"
			/>
		</div>

		<div :class="isFocused ? $style.dropdown : $style.hidden">
			<n8n-text size="small" compact :class="$style.header">
				{{ $locale.baseText('parameterInput.resultForItem') }} {{ hoveringItemNumber }}
			</n8n-text>
			<n8n-text :class="$style.body">
				<InlineExpressionEditorOutput
					:value="value"
					:isReadOnly="isReadOnly"
					:segments="segments"
				/>
			</n8n-text>
			<div :class="$style.footer">
				<n8n-text size="small" compact>
					{{ $locale.baseText('parameterInput.anythingInside') }}
				</n8n-text>
				<div :class="$style['expression-syntax-example']" v-text="`{{ }}`"></div>
				<n8n-text size="small" compact>
					{{ $locale.baseText('parameterInput.isJavaScript') }}
				</n8n-text>
				<n8n-link
					:class="$style['learn-more']"
					size="small"
					underline
					theme="text"
					:to="expressionsDocsUrl"
				>
					{{ $locale.baseText('parameterInput.learnMore') }}
				</n8n-link>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';

import { useNDVStore } from '@/stores/ndv';
import { useWorkflowsStore } from '@/stores/workflows';
import InlineExpressionEditorInput from '@/components/InlineExpressionEditor/InlineExpressionEditorInput.vue';
import InlineExpressionEditorOutput from '@/components/InlineExpressionEditor/InlineExpressionEditorOutput.vue';
import ExpressionFunctionIcon from '@/components/ExpressionFunctionIcon.vue';
import { createExpressionTelemetryPayload } from '@/utils/telemetryUtils';
import { EXPRESSIONS_DOCS_URL } from '@/constants';

import type { Segment } from '@/types/expressions';
import type { TargetItem } from '@/Interface';

type InlineExpressionEditorInputRef = InstanceType<typeof InlineExpressionEditorInput>;

export default defineComponent({
	name: 'ExpressionParameterInput',
	components: {
		InlineExpressionEditorInput,
		InlineExpressionEditorOutput,
		ExpressionFunctionIcon,
	},
	data() {
		return {
			isFocused: false,
			segments: [] as Segment[],
			expressionsDocsUrl: EXPRESSIONS_DOCS_URL,
		};
	},
	props: {
		path: {
			type: String,
		},
		value: {
			type: String,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		isForRecordLocator: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		...mapStores(useNDVStore, useWorkflowsStore),
		hoveringItemNumber(): number {
			return (this.hoveringItem?.itemIndex ?? 0) + 1;
		},
		hoveringItem(): TargetItem | null {
			if (this.ndvStore.isInputParentOfActiveNode) {
				return this.ndvStore.hoveringItem;
			}

			return null;
		},
		isDragging(): boolean {
			return this.ndvStore.isDraggableDragging;
		},
	},
	methods: {
		focus() {
			const inlineInputRef = this.$refs.inlineInput as InlineExpressionEditorInputRef | undefined;
			if (inlineInputRef?.$el) {
				inlineInputRef.focus();
			}
		},
		onFocus() {
			this.isFocused = true;

			this.$emit('focus');
		},
		onBlur(event: FocusEvent | KeyboardEvent) {
			if (
				event.target instanceof Element &&
				Array.from(event.target.classList).some((_class) => _class.includes('resizer'))
			) {
				return; // prevent blur on resizing
			}

			if (this.isDragging) return; // prevent blur on dragging

			const wasFocused = this.isFocused;

			this.isFocused = false;

			this.$emit('blur');

			if (wasFocused) {
				const telemetryPayload = createExpressionTelemetryPayload(
					this.segments,
					this.value,
					this.workflowsStore.workflowId,
					this.ndvStore.sessionId,
					this.ndvStore.activeNode?.type ?? '',
				);

				this.$telemetry.track('User closed Expression Editor', telemetryPayload);
			}
		},
		onChange({ value, segments }: { value: string; segments: Segment[] }) {
			if (this.isDragging) return;

			this.segments = segments;

			if (value === '=' + this.value) return; // prevent report on change of target item

			this.$emit('valueChanged', value);
		},
	},
});
</script>

<style lang="scss" module>
.expression-parameter-input {
	position: relative;

	.all-sections {
		height: 30px;
		display: flex;
		flex-direction: row;
		display: inline-table;
		width: 100%;
	}

	.prepend-section {
		padding: 0;
		padding-top: 2px;
		width: 22px;
		text-align: center;
	}

	.squared {
		border-radius: 0;
	}
}

.expression-editor-modal-opener {
	position: absolute;
	right: 0;
	bottom: 0;
	background-color: white;
	padding: 3px;
	line-height: 9px;
	border: var(--border-base);
	border-top-left-radius: var(--border-radius-base);
	border-bottom-right-radius: var(--border-radius-base);
	cursor: pointer;

	svg {
		width: 9px !important;
		height: 9px;
		transform: rotate(270deg);

		&:hover {
			color: var(--color-primary);
		}
	}
}

.focused > .prepend-section {
	border-color: var(--color-secondary);
	border-bottom-left-radius: 0;
}

.focused :global(.cm-editor) {
	border-color: var(--color-secondary);
}

.focused > .expression-editor-modal-opener {
	border-color: var(--color-secondary);
	border-bottom-right-radius: 0;
	background-color: white;
}

.hidden {
	display: none;
}

.dropdown {
	display: flex;
	flex-direction: column;
	position: absolute;
	z-index: 2; // cover tooltips
	background: white;
	border: var(--border-base);
	border-top: none;
	width: 100%;
	box-shadow: 0 2px 6px 0 rgba(#441c17, 0.1);
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;

	.header,
	.body,
	.footer {
		padding: var(--spacing-3xs);
	}

	.header {
		color: var(--color-text-dark);
		font-weight: var(--font-weight-bold);
		padding-left: var(--spacing-2xs);
		padding-top: var(--spacing-2xs);
	}

	.body {
		padding-top: 0;
		padding-left: var(--spacing-2xs);
		color: var(--color-text-dark);
	}

	.footer {
		border-top: var(--border-base);
		padding: var(--spacing-4xs);
		padding-left: var(--spacing-2xs);
		padding-top: 0;
		line-height: var(--font-line-height-regular);
		color: var(--color-text-base);

		.expression-syntax-example {
			display: inline-block;
			font-size: var(--font-size-2xs);
			height: var(--font-size-m);
			background-color: #f0f0f0;
			margin-left: var(--spacing-5xs);
			margin-right: var(--spacing-5xs);
		}

		.learn-more {
			line-height: 1;
			white-space: nowrap;
		}
	}
}
</style>
