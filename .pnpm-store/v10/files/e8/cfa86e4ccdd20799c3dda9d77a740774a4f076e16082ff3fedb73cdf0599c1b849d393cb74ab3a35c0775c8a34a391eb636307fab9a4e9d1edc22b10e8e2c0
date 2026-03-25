<script setup lang="ts">
import { DiffType } from '../types'
import type { SplitLineChange } from '../types'

defineProps<{
  splitLine: SplitLineChange
}>()

const emit = defineEmits(['expand'])

function getCodeMarker(type: DiffType) {
  if (type === DiffType.DELETE)
    return '-'
  if (type === DiffType.ADD)
    return '+'
  return ''
}

function onSplitLineMousedown(side: 'left' | 'right') {
  const leftElements = document.querySelectorAll('.file-diff-split .split-side-left')!
  const rightElements = document.querySelectorAll('.file-diff-split .split-side-right')!

  for (const el of rightElements)
    el.classList.toggle('no-select', side === 'left')

  for (const el of leftElements)
    el.classList.toggle('no-select', side === 'right')
}
</script>

<template>
  <tr v-if="splitLine.hideIndex !== undefined && splitLine.hide">
    <td class="blob-num blob-num-hunk" colspan="1" @click="emit('expand', splitLine)">
      >
    </td>
    <td class="blob-code blob-code-inner blob-code-hunk" colspan="3" align="left">
      ⋯
    </td>
  </tr>
  <tr v-else-if="!splitLine.hide">
    <template v-for="(line, index) in [splitLine.left, splitLine.right]">
      <!-- eslint-disable -->
      <template v-if="line.type === DiffType.EMPTY">
        <td class="blob-num blob-num-empty empty-cell" />
        <td class="blob-code blob-code-empty empty-cell" />
      </template>
      <template v-else>
        <td
          class="blob-num"
          :class="{
            'blob-num-deletion': line.type === DiffType.DELETE,
            'blob-num-addition': line.type === DiffType.ADD,
            'blob-num-context': line.type === DiffType.EQUAL,
            'blob-num-hunk': splitLine.hide !== undefined,
          }"
        >
          {{ line.num }}
        </td>
        <td
          class="blob-code"
          :class="{
            'blob-code-deletion': line.type === DiffType.DELETE,
            'blob-code-addition': line.type === DiffType.ADD,
            'blob-code-context': line.type === DiffType.EQUAL,
            'blob-code-hunk': splitLine.hide !== undefined,
            'split-side-left': index === 0,
            'split-side-right': index === 1,
          }"
          @mousedown="onSplitLineMousedown(index === 0 ? 'left' : 'right')"
        >
          <span
            class="blob-code-inner blob-code-marker" :data-code-marker="getCodeMarker(line.type)"
            v-html="line.code"
          />
        </td>
      </template>
      <!-- eslint-enable -->
    </template>
  </tr>
</template>

<style lang="scss"></style>
