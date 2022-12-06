<template>
	<div :class="$style['expression-parameter-input']" v-click-outside="onBlur">
		<div :class="[$style['all-sections'], { [$style['focused']]: isFocused }]">
			<div
				:class="[
					$style['prepend-section'],
					'el-input-group__prepend',
					{ [$style['squared']]: squarePrependSection },
				]"
			>
				<expression-function-icon />
			</div>
			<inline-expression-editor-input
				:value="value"
				:isReadOnly="isReadOnly"
				:targetItem="hoveringItem"
				:isSingleLine="squarePrependSection"
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
				@click="$emit('openerClick')"
			/>
		</div>

		<div :class="isFocused ? $style.dropdown : $style.hidden">
			<n8n-text size="small" compact :class="$style.header">
				{{ $locale.baseText('parameterInput.resultForItem') }} {{ hoveringItemNumber }}
			</n8n-text>
			<n8n-text :class="$style.body">
				<inline-expression-editor-output
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
				<n8n-link size="small" compact underline theme="text" :to="expressionsDocsUrl">
					{{ $locale.baseText('parameterInput.learnMore') }}
				</n8n-link>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { mapStores } from 'pinia';
import Vue from 'vue';

import { useNDVStore } from '@/stores/ndv';
import InlineExpressionEditorInput from '@/components/InlineExpressionEditor/InlineExpressionEditorInput.vue';
import InlineExpressionEditorOutput from '@/components/InlineExpressionEditor/InlineExpressionEditorOutput.vue';
import ExpressionFunctionIcon from '@/components/ExpressionFunctionIcon.vue';
import { EXPRESSIONS_DOCS_URL } from '@/constants';

import type { Segment } from '@/types/expressions';
import type { TargetItem } from '@/Interface';

Vue.component('expression-function-icon', ExpressionFunctionIcon);

export default Vue.extend({
	name: 'expression-parameter-input',
	components: {
		InlineExpressionEditorInput,
		InlineExpressionEditorOutput,
	},
	data() {
		return {
			isFocused: false,
			segments: [] as Segment[],
		};
	},
	props: {
		value: {
			type: String,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		/**
		 * Whether the prepend section has right-angle borders. Only for record locator.
		 */
		squarePrependSection: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		...mapStores(useNDVStore),
		expressionsDocsUrl(): string {
			return EXPRESSIONS_DOCS_URL;
		},
		hoveringItemNumber(): number {
			return (this.hoveringItem?.itemIndex ?? 0) + 1;
		},
		hoveringItem(): TargetItem | null {
			return this.ndvStore.hoveringItem;
		},
		isDragging(): boolean {
			return this.ndvStore.isDraggableDragging;
		},
	},
	methods: {
		focus() {
			const inlineInput = this.$refs.inlineInput as (Vue & HTMLElement) | undefined;

			if (inlineInput?.$el) inlineInput.focus();
		},
		onFocus() {
			this.isFocused = true;
		},
		onBlur() {
			if (this.isDragging) return;

			this.isFocused = false;
		},
		onChange({ value, segments }: { value: string; segments: Segment[] }) {
			if (this.isDragging) return;

			this.segments = segments;

			// if identical to current, only hovering item changed
			// hence do not re-emit, preventing marking output as stale
			if (value === '=' + this.value) return;

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
		border-collapse: separate;
		border-spacing: 0;
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

.pointer {
	cursor: pointer;
}

.expression-editor-modal-opener {
	position: absolute;
	right: 0;
	bottom: 0;
	background-color: white;
	padding: 3px;
	border: var(--border-base);
	line-height: 9px;
	border-top-left-radius: var(--border-radius-base);
	border-bottom-right-radius: var(--border-radius-base);
	cursor: pointer;

	svg {
		height: 9px;
		width: 9px !important;
		transform: rotate(270deg);
	}

	svg:hover {
		transform: rotate(270deg);
		color: var(--color-primary);
	}
}

.focused > .prepend-section {
	border-color: var(--color-secondary);
	border-bottom-left-radius: 0;
}

/* cm-editor */
.focused > div > div {
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
	z-index: 1;
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
		padding-bottom: var(--spacing-3xs);
	}

	.body {
		padding-top: 0;
		padding-left: var(--spacing-2xs);
		color: var(--color-text-dark);
		// max-height: 80px;
		// padding-bottom: 14px;
	}

	.footer {
		border-top: var(--border-base);
		padding: var(--spacing-4xs);
		padding-left: var(--spacing-2xs);
		padding-top: 0;
		line-height: var(--font-line-height-regular) !important;
		color: var(--color-text-base);

		.expression-syntax-example {
			display: inline-block;
			font-size: var(--font-size-2xs);
			height: 16px;
			background-color: #f0f0f0;
			margin-left: var(--spacing-5xs);
			margin-right: var(--spacing-5xs);
		}
	}
}
</style>
