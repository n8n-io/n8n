<template>
  <div
    :class="[$style.sticky, isEditable ? $style.editMode : '']"
    :style="styles"
    @dblclick="changeMode"
  >
    <n8n-markdown
      v-if="!isEditable"
      :content="content"
      theme="sticky"
    />
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
    readOnly: {
      type: Boolean,
      default: false,
    },
    width: {
      type: Number,
      default: 220,
    }
  },
  components: {
    N8nInput,
    N8nMarkdown,
    N8nText,
  },
  computed: {
    styles() {
      return {
        ...(this.height ? { height: this.height + 'px' } : { height: '100%' }),
        ...(this.width ? { width: this.width + 'px' } : { width: '100%' }),
      };
    },
  },
  data() {
    return {
      isEditable: false,
      tempValue: ''
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
    this.tempValue = this.content;
  }
};
</script>

<style lang="scss" module>
.sticky {
  min-width: 150px;
  min-height: 80px;
  padding: var(--spacing-s) var(--spacing-s) var(--spacing-xl);
  background-color: var(--color-sticky-default-background);
  border: 1px solid var(--color-sticky-default-border);
  border-radius: var(--border-radius-large);
  cursor: pointer;
}

.editMode {
  padding: var(--spacing-2xs) var(--spacing-2xs) 0;
  cursor: default;
}

.footer {
  padding: var(--spacing-4xs) 0;
  display: flex;
  justify-content: flex-end;
}
</style>

<style lang="scss">
.textarea {
  height: calc(100% - var(--spacing-m));
  
  .el-textarea {
    height: 100%;

    .el-textarea__inner {
      height: 100%;
      resize: unset;
    }
  }
}
</style>
