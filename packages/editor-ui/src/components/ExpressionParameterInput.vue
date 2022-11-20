<template>
	<div
		:class="[$style['expression-parameter-input'], { [$style['pointer']]: openModalOnClick }]"
		@click="openModalOnClick && $emit('inputClick')"
		v-click-outside="onBlur"
	>
		<div :class="[$style['all-sections'], { [$style['focused']]: isFocused }]">
			<div
				:class="[
					$style['prepend-section'],
					'el-input-group__prepend',
					{ [$style['squared']]: squarePrependSection },
				]"
			>
				fx
			</div>
			<inline-expression-editor-input
				:value="value"
				:isReadOnly="isReadOnly"
				@focus="onFocus"
				@blur="onBlur"
				@change="onChange"
				ref="inlineInput"
			/>
			<n8n-icon
				v-if="!openModalOnClick && !isDragging"
				icon="external-link-alt"
				size="xsmall"
				:class="$style['expression-editor-modal-opener']"
				@click="$emit('openerClick')"
			/>
		</div>

		<div
			:class="
				isFocused && !openModalOnClick
					? $style['expression-parameter-input-dropdown']
					: $style.hidden
			"
		>
			<n8n-text :class="$style.header">
				{{ $locale.baseText('parameterInput.resultForItem') }} {{ hoveringItemNumber }}
			</n8n-text>
			<n8n-text :class="$style.body">
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque cursus quis dui quis
				hendrerit. Morbi quis egestas leo. Class aptent taciti sociosqu ad litora torquent per
				conubia nostra, per inceptos himenaeos.
			</n8n-text>
			<div :class="$style.footer">
				<n8n-text>
					{{ $locale.baseText('parameterInput.anythingInside') }}
				</n8n-text>
				<div :class="$style['expression-syntax-example']" v-text="`{{ }}`"></div>
				<n8n-text>
					{{ $locale.baseText('parameterInput.isJavaScript') }}
				</n8n-text>
				<n8n-link size="medium" :to="expressionsDocsUrl">
					{{ $locale.baseText('parameterInput.learnMore') }}
				</n8n-link>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import InlineExpressionEditorInput from '@/components/InlineExpressionEditor/InlineExpressionEditorInput.vue';
import { EXPRESSIONS_DOCS_URL } from '@/constants';
import { useNDVStore } from '@/stores/ndv';
import { mapStores } from 'pinia';
import Vue from 'vue';
import type { Segment } from './InlineExpressionEditor/types';

export default Vue.extend({
	name: 'expression-parameter-input',
	components: {
		InlineExpressionEditorInput,
	},
	data() {
		return {
			isFocused: false,
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
		 * Whether clicking anywhere on the input (not on the opener icon) opens the expression editor modal. Only for record locator.
		 */
		openModalOnClick: {
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
			return (this.ndvStore.hoveringItem?.itemIndex ?? 0) + 1;
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
		onChange({ value }: { value: string; segments: Segment[] }) {
			// @TODO: Use segments for inline output
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
		line-height: normal;
		display: inline-table;
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
	}

	.prepend-section {
		font-size: var(--font-size-xs);
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
	padding: var(--spacing-4xs);
	border: var(--border-base);
	border-top-left-radius: var(--border-radius-base);
	border-bottom-right-radius: var(--border-radius-base);
	cursor: pointer;

	svg {
		transform: rotate(270deg);
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

.expression-parameter-input-dropdown {
	display: flex;
	flex-direction: column;
	position: absolute;
	z-index: 1;
	background: white;
	border: var(--border-base);
	border-top: none;
	// @TODO: shadow

	.header,
	.body,
	.footer {
		padding: var(--spacing-3xs);
	}

	.header {
		font-weight: bold;
	}

	.footer {
		border-top: var(--border-base);

		.expression-syntax-example {
			display: inline-block;
			height: 16px;
			line-height: 1;
			background-color: #f0f0f0;
			margin-left: var(--spacing-5xs);
			margin-right: var(--spacing-5xs);
		}
	}
}
</style>
