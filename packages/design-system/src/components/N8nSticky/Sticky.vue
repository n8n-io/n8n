<template>
  <div
    :class="$style.sticky"
    :style="styles"
    @dblclick="changeMode"
  >
    <n8n-markdown
      v-if="!isEditable"
      :content="content"
      theme="sticky"
    />
    <n8n-input
      v-else
      :value="content"
      type="textarea"
      @blur="onBlur"
      @change="onChange"
      @focus="onFocus"
      @input="onInput"
    />
  </div>
</template>

<script lang="ts">
import N8nMarkdown from '../N8nMarkdown';
import N8nInput from '../N8nInput';

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
    N8nMarkdown,
    N8nInput,
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
      isEditable: false
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
  }
};
</script>

<style lang="scss" module>
.sticky {
  min-width: 150px;
  min-height: 80px;
  overflow-y: auto;
  padding: var(--spacing-s) var(--spacing-s) var(--spacing-xl);
  background-color: var(--color-sticky-default-background);
  border: 1px solid var(--color-sticky-default-border);
  border-radius: var(--border-radius-large);
}
</style>
