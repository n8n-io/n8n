<script setup lang="ts">
import { computed, ref, watch } from 'vue-demi'
import { createSplitDiff, createUnifiedDiff } from './utils'
import UnifiedViewer from './unified/UnifiedViewer.vue'
import SplitViewer from './split/SplitViewer.vue'
import DownArrowIcon from './icons/DownArrowIcon.vue'
import UpArrowIcon from './icons/UpArrowIcon.vue'

import './style.scss'

interface Props {
  newString: string
  oldString: string
  language?: string
  context?: number
  diffStyle?: 'word' | 'char'
  forceInlineComparison?: boolean
  outputFormat?: 'line-by-line' | 'side-by-side'
  trim?: boolean
  noDiffLineFeed?: boolean
  maxHeight?: string
  filename?: string
  newFilename?: string
  hideHeader?: boolean
  hideStat?: boolean
  theme?: 'light' | 'dark'
  // Give a pattern to ignore matching lines eg: '(time|token)'
  ignoreMatchingLines?: string
}

const props = withDefaults(defineProps<Props>(), {
  language: 'plaintext',
  context: 10,
  diffStyle: 'word',
  forceInlineComparison: false,
  outputFormat: 'line-by-line',
  trim: false,
  noDiffLineFeed: false,
  maxHeight: undefined,
  filename: undefined,
  newFilename: undefined,
  hideHeader: false,
  hideStat: false,
  theme: 'light',
  ignoreMatchingLines: undefined,
})

const emits = defineEmits<{
  (e: 'diff', diffResult: DiffResult): void
}>()

interface DiffResult {
  stat: {
    isChanged: boolean
    addNum: number
    delNum: number
  }
}

const isUnifiedViewer = computed(() => props.outputFormat === 'line-by-line')

const oldString = computed(() => {
  let value = props.oldString || ''
  value = props.trim ? value.trim() : value
  value = props.noDiffLineFeed ? value.replace(/(\r\n)/g, '\n') : value
  return value
})
const newString = computed(() => {
  let value = props.newString || ''
  value = props.trim ? value.trim() : value
  value = props.noDiffLineFeed ? value.replace(/(\r\n)/g, '\n') : value
  return value
})

const raw = computed(() =>
  isUnifiedViewer.value
    ? createUnifiedDiff(oldString.value, newString.value, props.language, props.diffStyle, props.forceInlineComparison, props.context, props.ignoreMatchingLines)
    : createSplitDiff(oldString.value, newString.value, props.language, props.diffStyle, props.forceInlineComparison, props.context, props.ignoreMatchingLines),
)
const diffChange = ref(raw.value)
const isNotChanged = computed(() => diffChange.value.stat.additionsNum === 0 && diffChange.value.stat.deletionsNum === 0)

const currentDiffIndex = ref(-1)

function goToNextDiff() {
  const diffs = document.querySelectorAll('.blob-code-addition')
  if (currentDiffIndex.value < diffs.length - 1) {
    currentDiffIndex.value++
    updateCurrentDiffHighlight(diffs)
  }
}

function goToPrevDiff() {
  const diffs = document.querySelectorAll('.blob-code-addition')
  if (currentDiffIndex.value > 0) {
    currentDiffIndex.value--
    updateCurrentDiffHighlight(diffs)
  }
}

function updateCurrentDiffHighlight(diffs: NodeListOf<Element>) {
  diffs.forEach((diff: { classList: { remove: (arg0: string) => any } }) => diff.classList.remove('current-diff'))

  const currentDiff = diffs[currentDiffIndex.value]

  if (currentDiff) {
    currentDiff.classList.add('current-diff')
    currentDiff.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

watch(() => props, () => {
  diffChange.value = raw.value
  emits('diff', {
    stat: {
      isChanged: !isNotChanged.value,
      addNum: diffChange.value.stat.additionsNum,
      delNum: diffChange.value.stat.deletionsNum,
    },
  })
}, { deep: true, immediate: true })
</script>

<template>
  <div class="code-diff-view" :theme="theme" :style="{ maxHeight }">
    <div v-if="!hideHeader" class="file-header">
      <!--  line by line -->
      <div v-if="isUnifiedViewer" class="file-info">
        <span>
          <div class="info-left">{{ filename }}</div>
          <div class="info-left">{{ newFilename }}</div>
        </span>
        <span class="diff-commandbar">
          <button class="command-item-button" title="Next Change" @click="goToNextDiff">
            <DownArrowIcon />
          </button>
          <button class="command-item-button" title="Previous Change" @click="goToPrevDiff">
            <UpArrowIcon />
          </button>
        </span>
        <span v-if="!hideStat" class="diff-stat">
          <slot name="stat" :stat="diffChange.stat">
            <span class="diff-stat-added">+{{ diffChange.stat.additionsNum }} additions</span>
            <span class="diff-stat-deleted">-{{ diffChange.stat.deletionsNum }} deletions</span>
          </slot>
        </span>
      </div>
      <!-- side by side -->
      <div v-else class="file-info">
        <span class="info-left">{{ filename }}</span>
        <span class="info-right">
          <span style="margin-left: 20px;">{{ newFilename }}</span>
          <span class="diff-commandbar">
            <button class="command-item-button" title="Next Change" @click="goToNextDiff">
              <DownArrowIcon />
            </button>
            <button class="command-item-button" title="Previous Change" @click="goToPrevDiff">
              <UpArrowIcon />
            </button>
          </span>
          <span v-if="!hideStat" class="diff-stat">
            <slot name="stat" :stat="diffChange.stat">
              <span class="diff-stat-added">+{{ diffChange.stat.additionsNum }} additions</span>
              <span class="diff-stat-deleted">-{{ diffChange.stat.deletionsNum }} deletions</span>
            </slot>
          </span>
        </span>
      </div>
    </div>
    <UnifiedViewer v-if="isUnifiedViewer" :diff-change="diffChange" />
    <SplitViewer v-else :diff-change="diffChange" />
  </div>
</template>

<style lang="scss">
</style>
