<template>
  <div
    id="sticky"
    :class="[$style.sticky, isEditable ? $style.editMode : '']"
    :style="styles"
    @dblclick="changeMode"
  >
    <n8n-resize 
      v-if="!isEditable"
      :minHeight="minHeight"
      :minWidth="minWidth"
      :resizer="resizer"
    >
      <template>
        <n8n-markdown
          :content="content"
          theme="sticky"
        />
      </template>
    </n8n-resize>
    
    <div class="textarea" v-else>
      <n8n-input
        v-model="tempValue"
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
      tempValue: '',
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
  },
  mounted() {
   this.resizer = document.querySelector('#sticky');
   this.tempValue = this.content;
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
