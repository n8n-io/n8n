<template>
  <div
    :id="`sticky-${id}`"
    :class="[$style.sticky, isEditable ? $style.editMode : '']"
    :style="styles"
    @dblclick="changeMode"
  >
    <n8n-resize 
      v-if="!isEditable"
      :minHeight="minHeight"
      :minWidth="minWidth"
      :resizer="resizer"
      @onResizeEnd="onResizeEnd"
      @onResizeStart="onResizeStart"
    >
      <template>
        <div :class="$style.wrapper">
          <n8n-markdown
            :content="tempContent"
            theme="sticky"
          />
        </div>
      </template>
    </n8n-resize>
    
    <div class="textarea" v-else>
      <n8n-input
        v-model="tempContent"
        type="textarea"
        :rows="5"
        @blur="onBlur"
        @change="onChange"
        @focus="onFocus"
        @input="onInput"
      />
      <div :class="$style.footer">
        <n8n-text
          size="xsmall"
          aligh="right"
        >
          You can style with 
          <a href="https://www.markdownguide.org/getting-started/" target="_blank">
            Markdown
          </a>
        </n8n-text>
      </div>
    </div>
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
    width: {
      type: Number,
      default: 240,
    }
  },
  watch: {
    content(content) {
      this.tempContent = content;
    },
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
  },
  data() {
    return {
      isEditable: false,
      tempContent: this.content,
      resizer: null,
    }
  },
  methods: {
    changeMode() {
      if (!this.readOnly)

      if (this.isEditable) {
        this.$emit('unfocus', this.isEditable);
      }
      this.isEditable =! this.isEditable;
    },
    onBlur(value) {
      this.$emit('blur', value);
    },
    onChange(value: string) {
      this.$emit('change', value);
    },
    onFocus(value) {
      this.$emit('focus', value);
    },
    onInput(value: string) {
      this.$emit('input', value);
    },
    onResizeEnd(resizeEnd) {
      this.$emit('onResizeEnd', resizeEnd);
    },
    onResizeStart(resizeStart) {
      this.$emit('onResizeStart', resizeStart);
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
  border-radius: var(--border-radius-large);
  cursor: pointer;
  z-index: 2;
}

.wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  padding: var(--spacing-s) var(--spacing-s) 0;

  &::after {
    content: '';
    width: 100%;
    height: 24px;
    left: 0;
    bottom: 0;
    position: absolute;
    background: linear-gradient(180deg, var(--color-sticky-default-background), #fff5d600 0.01%, var(--color-sticky-default-background));
    border-radius: var(--border-radius-large);
  }
}

.editMode {
  padding: var(--spacing-2xs) var(--spacing-2xs) 0;
  cursor: default;
}

.footer {
  padding: var(--spacing-4xs) 0 var(--spacing-xs);
  display: flex;
  justify-content: flex-end;
}
</style>

<style lang="scss">
.textarea {
  height: calc(100% - var(--spacing-l));
  
  .el-textarea {
    height: 100%;

    .el-textarea__inner {
      height: 100%;
      resize: unset;
    }
  }
}
</style>
