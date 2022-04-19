<template>
  <div
    :id="`sticky-${id}`"
    :class="[$style.sticky, isStickyEditable ? $style.editMode : '']"
    :style="styles"
  >
    <n8n-resize
      :isResizingEnabled="!readOnly"
      :minHeight="minHeight"
      :minWidth="minWidth"
      :resizer="resizer"
      @onResizeEnd="onResizeEnd"
      @onResizeStart="onResizeStart"
    >
      <template>
        <div
          v-if="!isStickyEditable"
          :class="$style.wrapper"
          @dblclick="changeMode"
        >
          <n8n-markdown
            :content="tempContent"
            theme="sticky"
          />
        </div>
        <div 
          v-else
          @mouseover="onMouseHover"
          @mouseout="onMouseHoverEnd"
          class="sticky-textarea"
          :class="{'full-height': !shouldShowFooter}"
        >
          <n8n-input
            v-model="tempContent"
            type="textarea"
            :rows="5"
            @blur="onBlur"
            @change="onChange"
            @focus="onFocus"
            @input="onInput"
          />
          <div v-if="shouldShowFooter" :class="$style.footer">
            <n8n-text
              size="xsmall"
              aligh="right"
            >
              You can style with 
              <a href="https://docs.n8n.io/getting-started/key-components/workflow-notes.html" target="_blank">
                Markdown
              </a>
            </n8n-text>
          </div>
        </div>
      </template>
    </n8n-resize>
    
    
  </div>
</template>

<script lang="ts">
import N8nInput from '../N8nInput';
import N8nMarkdown from '../N8nMarkdown';
import N8nResize from '../N8nResize';
import N8nText from '../N8nText';

export default {
  name: 'n8n-sticky',
  props: {
    content: {
      type: String,
    },
    height: {
      type: Number,
      default: 160,
    },
    id: {
      type: String,
      default: '0',
    },
    isDefaultTextChanged: {
      type: Boolean,
      default: false,
    },
    isEditable: {
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
    totalSize: {
      type: Number,
      default: 400,
    },
    width: {
      type: Number,
      default: 240,
    },
    zIndex: {
      type: Number,
      default: -400,
    },
  },
  watch: {
    content(content) {
      this.tempContent = content;
    },
    isEditable(isEditable) {
      this.isStickyEditable = isEditable;
      this.$emit('onChangeMode', this.isEditable);
    }
  },
  components: {
    N8nInput,
    N8nMarkdown,
    N8nResize,
    N8nText,
  },
  computed: {
    styles() {
      return {
        ...(this.height ? { height: this.height + 'px' } : { height: '100%' }),
        ...(this.width ? { width: this.width + 'px' } : { width: '100%' }),
        ...(this.minHeight ? { minHeight: this.minHeight + 'px' } : { minHeight: '100%' }),
        ...(this.minWidth ? { minWidth: this.minWidth + 'px' } : { minWidth: '100%' }),
      };
    },
    shouldShowFooter() {
      return this.componentHeight > 100 && this.componentWidth > 155;
    },
  },
  data() {
    return {
      componentHeight: this.height,
      componentWidth: this.width,
      isStickyEditable: false,
      tempContent: this.content,
      resizer: null,
    }
  },
  methods: {
    changeMode() {
      if (!this.readOnly) {
        setTimeout(() => {
          const textArea = document.querySelector('.el-textarea__inner');
          if (textArea) {
            if (!this.isDefaultTextChanged) {
              textArea.select();
            }
            textArea.focus();
          }
        }, 100);

        if (this.isStickyEditable) {
          this.$emit('unfocus', this.isStickyEditable);
        }

        this.isStickyEditable =! this.isStickyEditable; 
        this.$emit('onChangeMode', this.isStickyEditable); 
      }  
    },
    onBlur(value) {
      this.isStickyEditable = false;
      this.$emit('onChangeMode', this.isStickyEditable); 
      this.$emit('blur', value);
    },
    onChange(value: string) {
      this.$emit('change', value);
    },
    onFocus(value) {
      this.$emit('focus', value);
    },
    onInput(value: string) {
      this.tempContent = value;
      this.$emit('input', value);
    },
    onMouseHover() {
      this.$emit('onMouseHover', true);
    },
    onMouseHoverEnd() {
      this.$emit('onMouseHover', false);
    },
    onResizeEnd(resizeEnd) {
      this.$emit('onResizeEnd', resizeEnd);
    },
    onResizeStart(parameters) {
      this.componentHeight = parameters.height;
      this.componentWidth = parameters.width;

      this.$emit('onResizeStart', parameters);
    },
  },
  mounted() {
   this.resizer = document.querySelector(`#sticky-${this.id}`);
  },
};
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

.editMode {
  padding: var(--spacing-2xs) var(--spacing-2xs) 0;
  cursor: default;
}

.footer {
  padding: var(--spacing-5xs) 0 var(--spacing-2xs);
  display: flex;
  justify-content: flex-end;
}
</style>

<style lang="scss">
.sticky-textarea {
  width: calc(100% - var(--spacing-s));
  height: calc(100% - var(--spacing-l));
  
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
