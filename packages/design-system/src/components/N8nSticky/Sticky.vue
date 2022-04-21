<template>
  <div
    :class="{[$style.sticky]: true, [$style.editMode]: false}"
    :style="styles"
		@keydown.prevent
  >
    <resize
      :isResizingEnabled="!readOnly"
      @resizeend="onResizeEnd"
      @resize="onResize"
      @resizestart="onResizeStart"
    >
      <template>
        <div
          v-show="!editMode"
          :class="$style.wrapper"
          @dblclick.stop="onDoubleClick"
        >
          <n8n-markdown
            theme="sticky"
						:content="content"
						:withMultiBreaks="true"
          />
        </div>
        <div
          v-show="editMode"
					@click.stop
					@keydown.esc="onInputBlur"
					@keydown.stop
          @mouseover="onMouseHover"
          @mouseout="onMouseHoverEnd"
          class="sticky-textarea"
          :class="{'full-height': !shouldShowFooter}"
        >
          <n8n-input
            :value="content"
            type="textarea"
            :rows="5"
            @blur="onInputBlur"
            @input="onInput"
						ref="input"
          />
          <div v-if="shouldShowFooter" :class="$style.footer">
            <n8n-text
              size="xsmall"
              aligh="right"
            >
							<span v-html="t('sticky.markdownHint')"></span>
            </n8n-text>
          </div>
        </div>
      </template>
    </resize>
  </div>
</template>

<script lang="ts">
import N8nInput from '../N8nInput';
import N8nMarkdown from '../N8nMarkdown';
import Resize from './Resize';
import N8nText from '../N8nText';
import Locale from '../../mixins/locale';
import mixins from 'vue-typed-mixins';

export default mixins(Locale).extend({
	name: 'n8n-sticky',
	props: {
		content: {
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
		minHeight: {
			type: Number,
			default: 80,
		},
		minWidth: {
			type: Number,
			default: 150,
		},
		readOnly: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		N8nInput,
		N8nMarkdown,
		Resize,
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
		styles() {
			return {
				height: this.resHeight + 'px',
				width: this.resWidth + 'px',
			};
		},
		shouldShowFooter() {
			return this.resHeight > 100 && this.resWidth > 155;
		},
	},
	methods: {
		onDoubleClick() {
			if (!this.readOnly) {
				this.$emit('edit', true);
			}
		},
		onInputBlur(value) {
			if (!this.isResizing) {
				this.$emit('edit', false);
			}
		},
		onInput(value: string) {
			this.$emit('input', value);
		},
		onMouseHover() {
			this.$emit('onMouseHover', true);
		},
		onMouseHoverEnd() {
			this.$emit('onMouseHover', false);
		},
		onResize(deltas) {
			this.$emit('resize', deltas);
		},
		onResizeEnd(resizeEnd) {
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
				if (newMode && !prevMode && this.$refs.input && this.$refs.input.$refs && this.$refs.input.$refs.textarea) {
					const textarea = this.$refs.input.$refs.textarea;
					if (this.defaultText === this.content) {
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
  cursor: pointer;
}

.wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  padding: var(--spacing-2xs) var(--spacing-xs) 0;

  &::after {
    content: '';
    width: 100%;
    height: 24px;
    left: 0;
    bottom: 0;
    position: absolute;
    background: linear-gradient(180deg, var(--color-sticky-default-background), #fff5d600 0.01%, var(--color-sticky-default-background));
    border-radius: var(--border-radius-base);
  }
}

.footer {
  padding: var(--spacing-5xs) 0 var(--spacing-2xs);
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
  height: calc(100% - var(--spacing-s));
}
</style>
