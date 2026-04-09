import { clamp } from '@/shared'

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

export function getThumbPosition(percentage: number): string {
  return `${percentage}%`
}
