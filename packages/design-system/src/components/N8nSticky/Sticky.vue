<template>
	<div
		:class="{ 'n8n-sticky': true, [$style.sticky]: true, [$style.clickable]: !isResizing }"
		:style="styles"
		@keydown.prevent
	>
		<n8n-resize-wrapper
			:isResizingEnabled="!readOnly"
			:height="height"
			:width="width"
			:minHeight="minHeight"
			:minWidth="minWidth"
			:scale="scale"
			:gridSize="gridSize"
			@resizeend="onResizeEnd"
			@resize="onResize"
			@resizestart="onResizeStart"
		>
			<div v-show="!editMode" :class="$style.wrapper" @dblclick.stop="onDoubleClick">
				<n8n-markdown
					theme="sticky"
					:content="modelValue"
					:withMultiBreaks="true"
					@markdown-click="onMarkdownClick"
				/>
			</div>
			<div
				v-show="editMode"
				@click.stop
				@mousedown.stop
				@mouseup.stop
				@keydown.esc="onInputBlur"
				@keydown.stop
				@wheel.stop
				:class="{ 'full-height': !shouldShowFooter, 'sticky-textarea': true }"
			>
				<n8n-input
					:modelValue="modelValue"
					type="textarea"
					:rows="5"
					@blur="onInputBlur"
					@update:modelValue="onUpdateModelValue"
					ref="input"
				/>
			</div>
			<div v-if="editMode && shouldShowFooter" :class="$style.footer">
				<n8n-text size="xsmall" aligh="right">
					<span v-html="t('sticky.markdownHint')"></span>
				</n8n-text>
			</div>
		</n8n-resize-wrapper>
	</div>
</template>

<script lang="ts">
import N8nInput from '../N8nInput';
import N8nMarkdown from '../N8nMarkdown';
import N8nResizeWrapper from '../N8nResizeWrapper';
import N8nText from '../N8nText';
import Locale from '../../mixins/locale';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'n8n-sticky',
	mixins: [Locale],
	props: {
		modelValue: {
			type: String,
		},
		height: {
			type: Number,
			default: 180,
		},
		width: {
			type: Number,
			default: 240,
		},
		minHeight: {
			type: Number,
			default: 80,
		},
		minWidth: {
			type: Number,
			default: 150,
		},
		scale: {
			type: Number,
			default: 1,
		},
		gridSize: {
			type: Number,
			default: 20,
		},
		id: {
			type: String,
			default: '0',
		},
		defaultText: {
			type: String,
		},
		editMode: {
			type: Boolean,
			default: false,
		},
		readOnly: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		N8nInput,
		N8nMarkdown,
		N8nResizeWrapper,
		N8nText,
	},
	data() {
		return {
			isResizing: false,
		};
	},
	computed: {
		resHeight(): number {
			if (this.height < this.minHeight) {
				return this.minHeight;
			}
			return this.height;
		},
		resWidth(): number {
			if (this.width < this.minWidth) {
				return this.minWidth;
			}
			return this.width;
		},
		styles(): { height: string; width: string } {
			return {
				height: `${this.resHeight}px`,
				width: `${this.resWidth}px`,
			};
		},
		shouldShowFooter(): boolean {
			return this.resHeight > 100 && this.resWidth > 155;
		},
	},
	methods: {
		onDoubleClick() {
			if (!this.readOnly) {
				this.$emit('edit', true);
			}
		},
		onInputBlur() {
			if (!this.isResizing) {
				this.$emit('edit', false);
			}
		},
		onUpdateModelValue(value: string) {
			this.$emit('update:modelValue', value);
		},
		onMarkdownClick(link: string, event: Event) {
			this.$emit('markdown-click', link, event);
		},
		onResize(values: unknown[]) {
			this.$emit('resize', values);
		},
		onResizeEnd(resizeEnd: unknown) {
			this.isResizing = false;
			this.$emit('resizeend', resizeEnd);
		},
		onResizeStart() {
			this.isResizing = true;
			this.$emit('resizestart');
		},
	},
	watch: {
		editMode(newMode, prevMode) {
			setTimeout(() => {
				if (newMode && !prevMode && this.$refs.input) {
					const textarea = this.$refs.input as HTMLTextAreaElement;
					if (this.defaultText === this.modelValue) {
						textarea.select();
					}
					textarea.focus();
				}
			}, 100);
		},
	},
});
</script>

<style lang="scss" module>
.sticky {
	position: absolute;
	background-color: var(--color-sticky-default-background);
	border: 1px solid var(--color-sticky-default-border);
	border-radius: var(--border-radius-base);
}

.clickable {
	cursor: pointer;
}

.wrapper {
	width: 100%;
	height: 100%;
	position: absolute;
	padding: var(--spacing-2xs) var(--spacing-xs) 0;
	overflow: hidden;

	&::after {
		content: '';
		width: 100%;
		height: 24px;
		left: 0;
		bottom: 0;
		position: absolute;
		background: linear-gradient(
			180deg,
			var(--color-sticky-default-background),
			#fff5d600 0.01%,
			var(--color-sticky-default-background)
		);
		border-radius: var(--border-radius-base);
	}
}

.footer {
	padding: var(--spacing-5xs) var(--spacing-2xs) 0 var(--spacing-2xs);
	display: flex;
	justify-content: flex-end;
}
</style>

<style lang="scss">
.sticky-textarea {
	height: calc(100% - var(--spacing-l));
	padding: var(--spacing-2xs) var(--spacing-2xs) 0 var(--spacing-2xs);
	cursor: default;

	.el-textarea {
		height: 100%;

		.el-textarea__inner {
			height: 100%;
			resize: unset;
		}
	}
}

.full-height {
	height: calc(100% - var(--spacing-2xs));
}
</style>
