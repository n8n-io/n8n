import { clamp } from '@/shared'

export const PAGE_KEYS = ['PageUp', 'PageDown']
export const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

export type SlideDirection = 'from-left' | 'from-right' | 'from-bottom' | 'from-top'

export const BACK_KEYS: Record<SlideDirection, string[]> = {
  'from-left': ['Home', 'PageDown', 'ArrowDown', 'ArrowLeft'],
  'from-right': ['Home', 'PageDown', 'ArrowDown', 'ArrowRight'],
  'from-bottom': ['Home', 'PageDown', 'ArrowDown', 'ArrowLeft'],
  'from-top': ['Home', 'PageUp', 'ArrowUp', 'ArrowLeft'],
}

// https://github.com/tmcw-up-for-adoption/simple-linear-scale/blob/master/index.js
export function linearScale(input: readonly [number, number], output: readonly [number, number]) {
  return (value: number) => {
    if (input[0] === input[1] || output[0] === output[1])
      return output[0]
    const ratio = (output[1] - output[0]) / (input[1] - input[0])
    return output[0] + ratio * (value - input[0])
  }
}

export function convertValueToPercentage(value: number, min: number, max: number) {
  if (max === min)
    return 0
  const maxSteps = max - min
  const percentPerStep = 100 / maxSteps
  const percentage = percentPerStep * (value - min)
  return clamp(percentage, 0, 100)
}

export function getThumbPosition(percentage: number, orientation: 'horizontal' | 'vertical'): string {
  if (orientation === 'horizontal') {
    return `calc(${percentage}% - var(--reka-slider-thumb-size, 16px) / 2)`
  }
  return `calc(${100 - percentage}% - var(--reka-slider-thumb-size, 16px) / 2)`
}
