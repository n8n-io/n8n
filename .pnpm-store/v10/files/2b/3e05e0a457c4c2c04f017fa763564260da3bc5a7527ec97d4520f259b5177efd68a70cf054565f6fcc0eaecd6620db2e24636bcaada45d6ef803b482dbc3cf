<script setup lang="ts">
import CodeDiff from './CodeDiff.vue'

withDefaults(defineProps<{
  language?: string
  text: string
}>(), {
  language: 'plaintext',
})
</script>

<template>
  <CodeDiff
    hide-header
    :language="language"
    :old-string="text"
    :new-string="text"
  />
</template>

<style scoped>
.code-diff-view :deep(td:nth-child(1)) {
  display: none;
}
</style>
