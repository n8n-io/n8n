<template>
	<div
		:class="{
			'n8n-sticky': true,
			[$style.sticky]: true,
			[$style.clickable]: !isResizing,
			[$style[`color-${backgroundColor}`]]: true,
		}"
		:style="styles"
		@keydown.prevent
	>
		<N8nResizeWrapper
			:is-resizing-enabled="!readOnly"
			:height="height"
			:width="width"
			:min-height="minHeight"
			:min-width="minWidth"
			:scale="scale"
			:grid-size="gridSize"
			@resizeend="onResizeEnd"
			@resize="onResize"
			@resizestart="onResizeStart"
		>
			<div v-show="!editMode" :class="$style.wrapper" @dblclick.stop="onDoubleClick">
				<N8nMarkdown
					theme="sticky"
					:content="modelValue"
					:with-multi-breaks="true"
					@markdown-click="onMarkdownClick"
				/>
			</div>
			<div
				v-show="editMode"
				:class="{ 'full-height': !shouldShowFooter, 'sticky-textarea': true }"
				@click.stop
				@mousedown.stop
				@mouseup.stop
				@keydown.esc="onInputBlur"
				@keydown.stop
			>
				<N8nInput
					ref="input"
					:model-value="modelValue"
					type="textarea"
					:rows="5"
					@blur="onInputBlur"
					@update:modelValue="onUpdateModelValue"
					@wheel="onInputScroll"
				/>
			</div>
			<div v-if="editMode && shouldShowFooter" :class="$style.footer">
				<N8nText size="xsmall" aligh="right">
					<span v-html="t('sticky.markdownHint')"></span>
				</N8nText>
			</div>
		</N8nResizeWrapper>
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
	name: 'N8nSticky',
	components: {
		N8nInput,
		N8nMarkdown,
		N8nResizeWrapper,
		N8nText,
	},
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
		backgroundColor: {
			value: [Number, String],
			default: 1,
		},
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
			const styles: { height: string; width: string } = {
				height: `${this.resHeight}px`,
				width: `${this.resWidth}px`,
			};

			return styles;
		},
		shouldShowFooter(): boolean {
			return this.resHeight > 100 && this.resWidth > 155;
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
		onInputScroll(event: WheelEvent) {
			// Pass through zoom events but hold regular scrolling
			if (!event.ctrlKey && !event.metaKey) {
				event.stopPropagation();
			}
		},
	},
});
</script>

<style lang="scss" module>
.sticky {
	position: absolute;
	border-radius: var(--border-radius-base);

	background-color: var(--color-sticky-background);
	border: 1px solid var(--color-sticky-border);

	.wrapper::after {
		opacity: 0.15;
		background: linear-gradient(
			180deg,
			var(--color-sticky-background) 0.01%,
			var(--color-sticky-border)
		);
	}
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
		border-radius: var(--border-radius-base);
	}
}

.footer {
	padding: var(--spacing-5xs) var(--spacing-2xs) 0 var(--spacing-2xs);
	display: flex;
	justify-content: flex-end;
}

.color-2 {
	--color-sticky-background: var(--color-sticky-background-2);
	--color-sticky-border: var(--color-sticky-border-2);
}

.color-3 {
	--color-sticky-background: var(--color-sticky-background-3);
	--color-sticky-border: var(--color-sticky-border-3);
}

.color-4 {
	--color-sticky-background: var(--color-sticky-background-4);
	--color-sticky-border: var(--color-sticky-border-4);
}

.color-5 {
	--color-sticky-background: var(--color-sticky-background-5);
	--color-sticky-border: var(--color-sticky-border-5);
}

.color-6 {
	--color-sticky-background: var(--color-sticky-background-6);
	--color-sticky-border: var(--color-sticky-border-6);
}

.color-7 {
	--color-sticky-background: var(--color-sticky-background-7);
	--color-sticky-border: var(--color-sticky-border-7);
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
