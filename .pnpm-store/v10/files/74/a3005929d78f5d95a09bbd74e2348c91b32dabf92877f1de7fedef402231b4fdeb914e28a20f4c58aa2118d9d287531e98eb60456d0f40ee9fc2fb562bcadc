<script setup lang="ts">
import type { SplitLineChange, SplitViewerChange } from '../types'
import SplitLine from './SplitLine.vue'

const props = defineProps<{
  diffChange: SplitViewerChange
}>()

function expandHandler({ hideIndex }: SplitLineChange) {
  if (hideIndex === undefined)
    return
  props.diffChange.collector[hideIndex!].lines.forEach((line) => {
    line.hide = false
    line.fold = false
  })
}
</script>

<template>
  <table class="file-diff-split diff-table">
    <colgroup>
      <col width="44">
      <col>
      <col width="44">
      <col>
    </colgroup>
    <tbody>
      <SplitLine v-for="(item, index) in diffChange?.changes" :key="index" :split-line="item" @expand="expandHandler" />
    </tbody>
  </table>
</template>

<style scoped></style>
